# ServerCrate

ServerCrate is a lightweight, Docker-packaged **local-network hub** that brings together:

* 📂  Categorised link dashboard – organise internal services and external sites into filterable categories.
* 🤖  AI Assistant – chat with either **Flowise** (default) or **Ollama** models right from the home page.
* 📝  Markdown-based **Project notes** editor – create, autosave and manage rich-text `.md` files via the admin panel.
* 🌈  Live theme customiser – pick a primary colour and the UI, animation, and favicon update instantly.
* 🔒  Admin panel – password-protected settings for links, categories, site title, colours, filters, chat config and project notes.

Everything runs inside a single Docker container; data lives in a bind-mounted host directory (`~/ServerCrate/data`) so upgrades don’t lose content.

---
## 1. Quick Start (first-time use)

```bash
# 1. Clone the repository
git clone https://github.com/tunell-andrew/ServerCrate.git
cd ServerCrate

# 2. Build and launch the container (stops any previous instance, rebuilds image)
./build-and-run.sh

# 3. Open your browser
http://localhost:7111    # replace localhost with your server IP if remote
```
The script:
1. Stops/removes any existing container named `ServerCrate`.
2. Builds the image **without cache** (`docker compose build --no-cache`).
3. Starts the stack in detached mode (`docker compose up -d`).

> **Credentials**  
> *Default admin password:* `password` (override via `ADMIN_PASSWORD` env var/compose).  
> *Application port:* Host **7111** → Container **3000**.

---
## 2. Updating to a newer version

```bash
cd ServerCrate        # inside the repo

git pull              # fetch latest code
./build-and-run.sh    # rebuild & restart
```
Your runtime data (JSON + project markdown) lives in `~/ServerCrate/data` on the host and is preserved.

---
## 3. Directory Overview

```
├── Dockerfile              # Node + production build
├── docker-compose.yml      # Exposes port 7111, mounts ./data
├── build-and-run.sh        # helper script (stop → build → up)
├── server.js               # Express backend & API routes
├── public/                 # Static frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── script.js           # Main client logic
│   └── styles.css          # Glass-morphism theme
└── data/                   # Volume mount – links, categories, project files, etc.
```

---
## 4. Customisation Highlights

* **AI Providers** – Admin → Settings → *AI Chat Configuration*  
  • *Flowise* – supply API URL + Chatflow ID.  
  • *Ollama*  – supply base URL + select model (project proxies to avoid CORS).
* **Theme Colour** – pick any hex; gradients, buttons and favicon recolour instantly.
* **Autosave Project Notes** – edits save every 2 s and on tab switch; files stored as Markdown under `data/projects/`.

---
## 5. Development Notes

* Node 18-alpine base image.
* Front-end rich editor uses `contenteditable`, Marked.js (Markdown→HTML) and Turndown (HTML→Markdown).
* `.gitignore` excludes `/data/*` and `/.claude/` (local AI settings).

Feel free to open issues or PRs on [GitHub](https://github.com/tunell-andrew/ServerCrate). 