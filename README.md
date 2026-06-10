# Windows 12

> A complete Windows 12-style desktop environment that runs entirely in the browser — no frameworks.

Windows12 is a browser-based desktop operating system simulation built with pure HTML, CSS, and vanilla JavaScript. It recreates the look and feel of a modern Windows desktop, including a window manager, a virtual file system, a taskbar, a start menu, and a suite of working applications such as a file explorer, text editor, terminal, browser, paint app, and calculator. There is no build step and no dependencies — everything runs from static files.

> Note: The user interface is in German.

## Features

- **Window manager** — Move, resize (8 handles), minimize, maximize, and snap layouts (edge docking, half/quarter tiling).
- **Virtual file system (VFS)** — A tree-structured file system persisted in `localStorage`. Create, rename, delete, read, and write folders and files.
- **File Explorer** — Sidebar, breadcrumb navigation, history, and context menus.
- **Terminal** — A built-in interpreter supporting commands such as `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `mv`, `cp`, `tree`, `grep`, `echo` (with `>` / `>>` redirection), `js` (run real JavaScript), `calc`, `curl` (real HTTP requests), `neofetch`, and `cowsay`.
- **Optional Python shell bridge** (`bridge.py`) — A local HTTP server that lets the web terminal execute real shell commands on your own machine.
- **Browser app** (Edge-style) — Google search rendered in an iframe, DuckDuckGo autocomplete, and Wikipedia search results.
- **Productivity apps** — Notepad-style editor with save (`Ctrl+S`) to the virtual file system, a calculator, and a Paint app using the Canvas API (brushes, shapes, export as PNG).
- **Games & utilities** — A fully playable Minesweeper, Task Manager, Clock, Photo Viewer, and Recycle Bin.
- **Command palette** (`Ctrl+Space`) — Search apps, files, and the web, plus inline calculations.
- **Copilot assistant** (`Ctrl+/`) — A rule-based chatbot that opens apps, changes the theme, performs calculations, fetches the weather, and searches the web.
- **Live weather** — Real weather data via the keyless Open-Meteo API, shown in the taskbar and widgets.
- **Personalization** — Light/dark mode, accent colors, multiple wallpapers, and an animated gradient-blob background.
- **System shell** — Boot, login, and shutdown screens, an action center, a calendar flyout, toast notifications, and selectable desktop icons.
- **Visual design** — A Fluent-style SVG icon set and a glassmorphism aesthetic.

## Tech Stack

- **HTML5**
- **CSS3** (glassmorphism, Flexbox / Grid)
- **Vanilla JavaScript** (ES6+, no frameworks)
- **Canvas API**
- **localStorage** (for VFS persistence)
- **Fetch API**
- **Python 3** (optional shell bridge via `http.server`)
- **External public APIs** — Open-Meteo (weather), DuckDuckGo and Wikipedia (search), all keyless

## Getting Started

No build is required and there are no dependencies to install.

**Option A — open directly**

Open `index.html` in your browser.

**Option B — run a local server** (recommended; some features behave better over HTTP)

```bash
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000) in your browser.

**Optional — real shell commands in the terminal**

To let the in-app terminal run real commands on your machine, start the bridge in a separate process:

```bash
python3 bridge.py
```

The bridge listens only on `localhost:8124`. It executes arbitrary system commands, so run it only on your own trusted machine and stop it (`Ctrl+C`) when you are done.

## Project Status

Complete. The project is a self-contained, working demo with no known build issues. It is intended as a portfolio piece showcasing front-end engineering with vanilla JavaScript.

## Screenshots

_Screenshots coming soon._
