# Blogtalk

Static Next.js blog exported for GitHub Pages, plus a local (zero-cost) AI manager that generates Markdown posts under `/content/posts` and can optionally `git add/commit/push`.

## Blog content

Posts live in:

- `content/posts/*.md`

Each post must include frontmatter:

```yaml
---
title: "Post Title"
date: "2026-02-13"
tags: ["AI", "Agents"]
summary: "Short description"
slug: "ai-agents"
---
```

## Local preview (Next.js)

- `npm install`
- `npm run dev`

## Local AI blog manager

### Ollama (local LLM)

This tool expects Ollama to be running locally at `OLLAMA_HOST` (default: `http://localhost:11434`).

Windows (Git Bash / Terminal):

- Start the server: `ollama serve`
- Pull the model (once): `ollama pull llama3.1`

Quick health check (should return JSON):

- `curl http://localhost:11434/api/tags`

If you see a connection error like `WinError 10061`, Ollama isn’t running yet.

### Setup

- `python -m venv .venv`
- `./.venv/Scripts/python.exe -m pip install -r requirements.txt`
- `copy .env.example .env`

### Chat CLI

- `./.venv/Scripts/python.exe -m ai_blog_manager.chat_cli`

Auto-commit + push after each post:

- `./.venv/Scripts/python.exe -m ai_blog_manager.chat_cli --git`

### MCP server (stdio)

- `./.venv/Scripts/python.exe -u -m ai_blog_manager.mcp_server`

Tool provided:

- `create_blog_post(payload)`
