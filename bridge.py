#!/usr/bin/env python3
"""
Windows 12 — Real Shell Bridge
================================
Optionaler lokaler Server, damit das Web-Terminal von Windows 12 ECHTE
Shell-Befehle auf deinem Rechner ausführen kann.

Start:
    python3 bridge.py

Danach im Windows-12-Terminal einfach Befehle tippen — sie laufen jetzt
wirklich in deiner zsh/bash-Shell.

⚠  SICHERHEIT: Dieser Server führt beliebige Systembefehle aus. Er lauscht
   ausschließlich auf 127.0.0.1 (localhost) und nimmt nur Verbindungen vom
   eigenen Rechner an. Trotzdem: Nur auf deinem eigenen, vertrauenswürdigen
   Rechner starten und nach Gebrauch wieder beenden (Strg+C).
"""

import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST, PORT = "127.0.0.1", 8124
HOME = os.path.expanduser("~")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/ping"):
            self._json(200, {"ok": True, "shell": os.environ.get("SHELL", "bash")})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if not self.path.startswith("/exec"):
            return self._json(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            return self._json(400, {"error": "bad json"})

        cmd = (data.get("cmd") or "").strip()
        cwd = data.get("cwd") or HOME
        if not os.path.isdir(cwd):
            cwd = HOME
        if not cmd:
            return self._json(200, {"stdout": "", "stderr": "", "cwd": cwd})

        # Run inside a shell so 'cd' and pipes work; track resulting cwd via a sentinel.
        wrapped = f'cd "{cwd}" 2>/dev/null; {cmd}\nprintf "\\n__WIN12_CWD__%s" "$(pwd)"'
        try:
            proc = subprocess.run(
                ["/bin/bash", "-lc", wrapped],
                capture_output=True, text=True, timeout=30,
            )
            out = proc.stdout
            new_cwd = cwd
            if "__WIN12_CWD__" in out:
                out, _, tail = out.rpartition("__WIN12_CWD__")
                new_cwd = tail.strip() or cwd
                out = out.rstrip("\n")
            self._json(200, {"stdout": out, "stderr": proc.stderr, "cwd": new_cwd})
        except subprocess.TimeoutExpired:
            self._json(200, {"stdout": "", "stderr": "⏱ Timeout (30s).", "cwd": cwd})
        except Exception as e:
            self._json(200, {"stdout": "", "stderr": f"Bridge-Fehler: {e}", "cwd": cwd})

    def log_message(self, *args):
        pass  # quiet


if __name__ == "__main__":
    print(f"⚡ Windows 12 Shell-Bridge läuft auf http://{HOST}:{PORT}")
    print("   Das Web-Terminal kann jetzt echte Befehle ausführen.")
    print("   Beenden mit Strg+C.\n")
    try:
        HTTPServer((HOST, PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Bridge beendet.")
