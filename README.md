# RemoteTerm

A lightweight tool for monitoring long-running terminal processes remotely. Start a process on your machine, watch it live from any browser.

## What it does

Developers frequently start long-running jobs (ML training, builds, data pipelines) and need to leave their machine. RemoteTerm lets you stream your terminal output to a browser in real time without SSH or leaving a laptop open.

## Live Demo

**Web app:** https://remote-term.vercel.app  
**Backend API:** https://remoterm-backend.onrender.com/api/health

## Stack

- **Backend** — Node.js, Express, WebSocket (ws), deployed on Render
- **Frontend** — React, Vite, xterm.js, deployed on Vercel
- **CLI Agent** — Python, ptyprocess, websockets
- **Database** — PostgreSQL (Supabase)
- **AI** — Gemini API (session summarization every 10 minutes)
- **Auth** — JWT

## How it works

1. Log in at remote-term.vercel.app and click New Session — a one-time code is generated
2. Run `remoterm connect` in your terminal and paste the code
3. A WebSocket tunnel is established between your machine and the server
4. Terminal output streams live to the browser dashboard
5. Every 10 minutes, Gemini summarizes the last 100 lines of output in plain English

## CLI Installation

```bash
pip install remoterm
```

Requires Linux or macOS. Windows users need WSL.

## CLI Usage

```bash
remoterm connect
```

Paste the code from the web app when prompted. Your terminal output will stream live to the browser.

## Project Status

Fully deployed and functional.

- Phase 1 — Foundation (auth, database, protected routes)
- Phase 2 — CLI agent (PTY spawning, one-time code verification)
- Phase 3 — Real-time streaming (WebSocket broker, xterm.js rendering)
- Phase 4 — AI summarization (Gemini API, rolling line buffer)
- Phase 5 — Deployment (Render, Vercel, PyPI) — in progress

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.8+
- WSL (if on Windows)
- Supabase project
- Gemini API key

### Backend

```bash
cd backend
npm install
# create .env with DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, PORT
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### CLI Agent

```bash
cd cli-agent
python3 -m venv venv
source venv/bin/activate
pip install -e .
remoterm connect
```
