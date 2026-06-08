# RemoteTerm

A lightweight tool for monitoring long-running terminal processes remotely. Start a process on your machine, watch it live from any browser.

## What it does

Developers frequently start long-running jobs (ML training, builds, data pipelines) and need to leave their machine. RemoteTerm lets you stream your terminal output to a browser in real time without SSH or leaving a laptop open.

## Stack

- **Backend** — Node.js, Express, WebSocket (ws)
- **Frontend** — React, Vite, xterm.js
- **CLI Agent** — Python, ptyprocess, websockets
- **Database** — PostgreSQL (Supabase)
- **AI** — Gemini API (session summarization)
- **Auth** — JWT

## How it works

1. Log in and click New Session — a one-time code is generated
2. Run `remoterm connect` in your terminal and paste the code
3. A WebSocket tunnel is established between your machine and the server
4. Terminal output streams live to the browser dashboard
5. Every 60 seconds, Gemini summarizes the last 100 lines of output

## Project Status

Currently in active development. Phases 1-4 complete (foundation, CLI agent, real-time streaming, AI summarization). Phase 5 (deployment) in progress.

## Local Development

See architecture document for full setup instructions.
