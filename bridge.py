#!/usr/bin/env python3
"""
Windows 12 — Real Shell Bridge
==============================
Optionaler lokaler Server, damit das Web-Terminal von Windows 12 ECHTE
Shell-Befehle auf deinem Rechner ausführen kann. Die Bridge liefert die App
gleich selbst aus, Terminal und Bridge haben damit denselben Origin.

Start:
    python3 bridge.py           # danach die ausgegebene URL im Browser öffnen
    python3 bridge.py --open    # öffnet die URL direkt im Standardbrowser

Sicherheit (die Bridge führt beliebige Befehle mit deinen Rechten aus):
  * lauscht nur auf 127.0.0.1, ist also im Netzwerk nicht erreichbar
  * prüft den Host-Header (Schutz gegen DNS-Rebinding)
  * akzeptiert nur den Origin der App: standardmässig nur die Bridge selbst,
    weitere ausdrücklich per  --allow-origin http://localhost:8000
  * /ping und /exec verlangen ein Zufallstoken. Es wird bei jedem Start neu
    erzeugt und der App über das URL-Fragment (#bridge=...) übergeben.
    Fragmente schickt der Browser nie an einen Server.
Trotzdem: nur auf dem eigenen Rechner starten und nach Gebrauch beenden (Strg+C).
"""

import argparse
import hmac
import json
import mimetypes
import os
import secrets
import shlex
import subprocess
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

HOST = "127.0.0.1"
DEFAULT_PORT = 8124
HOME = os.path.expanduser("~")
APP_DIR = Path(__file__).resolve().parent
STATIC_DIRS = ("css", "js")          # dazu index.html, sonst nichts (kein .git, kein bridge.py)
MAX_BODY = 64 * 1024                 # Befehle sind kurz
CMD_TIMEOUT = 30                     # Sekunden


class Handler(BaseHTTPRequestHandler):
    server_version = "Win12Bridge/2"
    sys_version = ""

    # werden in main() gesetzt
    token = ""
    port = DEFAULT_PORT
    allowed_hosts = frozenset()
    allowed_origins = frozenset()

    # ------------------------------------------------------------ Antworten
    def _send(self, code, body, ctype, cors=True, extra=None):
        self.send_response(code)
        if cors:
            self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, code, obj, cors=True):
        self._send(code, json.dumps(obj).encode("utf-8"), "application/json", cors=cors)

    def _cors(self):
        # Nur für erlaubte fremde Origins (z. B. --allow-origin http://localhost:8000).
        # Fremde Webseiten bekommen nie CORS-Header.
        origin = self.headers.get("Origin")
        if origin and origin in self.allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    # ------------------------------------------------------------ Prüfungen
    def _host_ok(self):
        host = (self.headers.get("Host") or "").strip().lower()
        if host in self.allowed_hosts:
            return True
        self._json(403, {"error": "host not allowed"}, cors=False)
        return False

    def _origin_ok(self):
        origin = self.headers.get("Origin")
        if origin is None or origin in self.allowed_origins:
            return True
        self._json(403, {"error": "origin not allowed"}, cors=False)
        return False

    def _token_ok(self):
        sent = self.headers.get("X-Bridge-Token", "")
        if sent and hmac.compare_digest(sent.encode("utf-8"), self.token.encode("utf-8")):
            return True
        self._json(401, {"error": "token required"})
        return False

    # ------------------------------------------------------------ Methoden
    def do_OPTIONS(self):
        if not self._host_ok():
            return
        origin = self.headers.get("Origin")
        if not origin or origin not in self.allowed_origins:
            return self._json(403, {"error": "origin not allowed"}, cors=False)
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")
        if self.headers.get("Access-Control-Request-Private-Network") == "true":
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_GET(self):
        if not (self._host_ok() and self._origin_ok()):
            return
        path = urlsplit(self.path).path
        if path == "/ping":
            if self._token_ok():
                self._json(200, {"ok": True, "shell": os.environ.get("SHELL", "bash")})
            return
        self._static(path)

    do_HEAD = do_GET

    def do_POST(self):
        if not (self._host_ok() and self._origin_ok()):
            return
        if urlsplit(self.path).path != "/exec":
            return self._json(404, {"error": "not found"})
        if not self._token_ok():
            return
        if (self.headers.get("Content-Type") or "").split(";")[0].strip().lower() != "application/json":
            return self._json(415, {"error": "content-type must be application/json"})
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = -1
        if length < 0 or length > MAX_BODY:
            return self._json(413, {"error": "body too large"})
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(data, dict):
                raise ValueError
        except Exception:
            return self._json(400, {"error": "bad json"})

        cmd = str(data.get("cmd") or "").strip()
        cwd = data.get("cwd") if isinstance(data.get("cwd"), str) else HOME
        if not os.path.isdir(cwd):
            cwd = HOME
        if not cmd:
            return self._json(200, {"stdout": "", "stderr": "", "cwd": cwd})

        # In einer Shell ausführen, damit 'cd' und Pipes gehen; das neue cwd per Marker zurückmelden.
        wrapped = f'cd {shlex.quote(cwd)} 2>/dev/null; {cmd}\nprintf "\\n__WIN12_CWD__%s" "$(pwd)"'
        try:
            proc = subprocess.run(
                ["/bin/bash", "-lc", wrapped],
                capture_output=True, text=True, timeout=CMD_TIMEOUT,
            )
            out = proc.stdout
            new_cwd = cwd
            if "__WIN12_CWD__" in out:
                out, _, tail = out.rpartition("__WIN12_CWD__")
                new_cwd = tail.strip() or cwd
                out = out.rstrip("\n")
            self._json(200, {"stdout": out, "stderr": proc.stderr, "cwd": new_cwd})
        except subprocess.TimeoutExpired:
            self._json(200, {"stdout": "", "stderr": f"Timeout ({CMD_TIMEOUT}s).", "cwd": cwd})
        except Exception as e:
            self._json(200, {"stdout": "", "stderr": f"Bridge-Fehler: {e}", "cwd": cwd})

    # ------------------------------------------------------------ App ausliefern
    def _static(self, path):
        rel = unquote(path).lstrip("/") or "index.html"
        parts = rel.split("/")
        allowed = rel == "index.html" or (len(parts) > 1 and parts[0] in STATIC_DIRS)
        if not allowed or any(p in ("", ".", "..") or p.startswith(".") for p in parts):
            return self._json(404, {"error": "not found"}, cors=False)
        file = (APP_DIR / rel).resolve()
        if APP_DIR not in file.parents or not file.is_file():
            return self._json(404, {"error": "not found"}, cors=False)
        ctype = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "text/javascript"):
            ctype += "; charset=utf-8"
        extra = {"X-Frame-Options": "DENY", "Content-Security-Policy": "frame-ancestors 'none'"}
        self._send(200, file.read_bytes(), ctype, cors=False, extra=extra)

    def log_message(self, *args):
        pass  # leise


def parse_origin(value):
    o = value.strip().rstrip("/").lower()
    u = urlsplit(o)
    if u.scheme not in ("http", "https") or not u.netloc or u.path or u.query or u.fragment:
        raise argparse.ArgumentTypeError(f"ungültiger Origin: {value!r} (Beispiel: http://localhost:8000)")
    return o


def main():
    ap = argparse.ArgumentParser(description="Windows 12 Shell-Bridge (nur localhost, mit Token)")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port (Standard {DEFAULT_PORT})")
    ap.add_argument("--allow-origin", type=parse_origin, action="append", default=[], metavar="ORIGIN",
                    help="zusätzlich erlaubter App-Origin, z. B. http://localhost:8000 (mehrfach möglich)")
    ap.add_argument("--open", action="store_true", help="App-URL direkt im Browser öffnen")
    args = ap.parse_args()

    port = args.port
    own = {f"http://127.0.0.1:{port}", f"http://localhost:{port}"}
    Handler.token = secrets.token_urlsafe(32)
    Handler.port = port
    Handler.allowed_hosts = frozenset({f"127.0.0.1:{port}", f"localhost:{port}"})
    Handler.allowed_origins = frozenset(own | set(args.allow_origin))

    try:
        httpd = ThreadingHTTPServer((HOST, port), Handler)
    except OSError as e:
        sys.exit(f"Port {port} nicht verfügbar: {e}")

    frag = f"#bridge={Handler.token}&port={port}"
    url = f"http://127.0.0.1:{port}/{frag}"
    print(f"Windows 12 Shell-Bridge läuft auf http://{HOST}:{port} (nur dieser Rechner)")
    print("Öffne die App über diese URL (enthält das Sitzungs-Token):\n")
    print(f"    {url}\n")
    for o in sorted(args.allow_origin):
        print(f"    oder: {o}/{frag}")
    print("Das Token gilt nur bis zum Beenden. Beenden mit Strg+C.\n")
    sys.stdout.flush()
    if args.open:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nBridge beendet.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
