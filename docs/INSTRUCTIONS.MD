**Subject: Technical Specifications for AI-Managed Blog Website (GitHub Pages + Next.js)**

Dear Development Agent,

This letter defines the architecture and constraints for building a blog website hosted on GitHub Pages and managed by a local AI agent that generates and updates Markdown blog posts automatically.

The system must be zero-cost, fully static, and AI-managed.

---

# 1. System Overview

We are building:

1. A blog website built with Next.js.
2. Hosted via **GitHub Pages**.
3. Source code stored on **GitHub**.
4. A local AI agent that:

   * Generates Markdown (MD) blog posts.
   * Saves them to the repository.
   * Commits and pushes changes.
   * Automatically triggers GitHub Pages deployment.

The system must require:

* No backend server
* No paid services
* No hosting fees
* No subscription-based infrastructure

Zero recurring cost.

---

# 2. Website Architecture (Next.js Static Export)

## 2.1 Framework

Use:

* Next.js

Configuration requirements:

* Must use static site generation (SSG).
* Must use `next export` or static output mode.
* No server-side rendering (SSR).
* No API routes.
* No server dependencies.

The output must be fully static HTML/CSS/JS suitable for GitHub Pages.

---

## 2.2 Deployment

Deployment method:

* GitHub repository
* Automatic deployment via GitHub Pages
* Prefer GitHub Actions workflow for build and deploy

Deployment flow:

1. AI creates Markdown file.
2. AI commits to repository.
3. Push triggers GitHub Action.
4. Next.js builds static site.
5. Static output deployed to GitHub Pages.

---

# 3. Blog Content Architecture

## 3.1 Content Storage

All blog posts must be stored as Markdown files:

```
/content/posts/
  2026-02-13-ai-agents.md
  2026-02-20-rag-systems.md
```

Each file must include frontmatter:

```yaml
---
title: "Post Title"
date: "2026-02-13"
tags: ["AI", "Agents"]
summary: "Short description"
slug: "ai-agents"
---
```

Content body must follow standard Markdown syntax.

---

## 3.2 Content Processing

The Next.js site must:

* Parse Markdown using a static-compatible library (e.g., gray-matter + remark).
* Generate static pages for:

  * Blog index
  * Individual post pages
  * Tag pages (optional)
* Sort posts by date descending.

All parsing must occur at build time.

---

# 4. AI Agent Requirements

## 4.1 Execution Environment

The AI agent must:

* Run locally on the user’s machine.
* Use a local model (e.g., via Ollama or similar).
* Not require paid APIs.
* Not rely on cloud inference.

Zero-cost operation.

---

## 4.2 Core Capabilities

The AI agent must:

1. Accept conversational prompts such as:

   * “Write a blog post about AI agents and automation.”
   * “Create a post about RAG systems.”
   * “Update my last post to include a section on vector databases.”

2. Generate:

   * Proper Markdown file.
   * Valid YAML frontmatter.
   * SEO-friendly slug.
   * Clean formatting.

3. Save file to:

   ```
   /content/posts/
   ```

4. Automatically:

   * Stage changes
   * Commit with descriptive message
   * Push to GitHub
   * Trigger site rebuild

---

# 5. Git Automation Requirements

The agent must:

* Use Git CLI.
* Authenticate via GitHub Personal Access Token stored in environment variables.
* Perform:

  * `git add`
  * `git commit`
  * `git push`

Commit message format:

```
AI Post: <Post Title>
```

Must handle:

* No-op commits
* Merge conflicts
* Push failures

---

# 6. Safety Constraints

The AI agent must:

* Only modify files inside `/content/posts/`.
* Not alter configuration files.
* Not modify GitHub Actions workflow.
* Validate frontmatter before writing.
* Prevent duplicate slugs.
* Prevent overwriting existing posts unless explicitly instructed.

---

# 7. Optional MCP Tool Layer

If implemented, create MCP tool:

### `create_blog_post`

Input:

```
{
  "title": "...",
  "tags": [...],
  "content": "...",
  "summary": "...",
  "overwrite": false
}
```

Responsibilities:

* Generate slug.
* Format frontmatter.
* Save Markdown file.
* Trigger git workflow.

This ensures structured and safe file generation.

---

# 8. GitHub Pages Configuration

Repository must:

* Enable GitHub Pages.
* Use either:

  * `/docs` folder
  * Or `gh-pages` branch
* Prefer GitHub Actions workflow to build Next.js and deploy static output.

No paid CI services allowed.

---

# 9. Development Constraints

The system must:

* Be fully static.
* Be fully automatable.
* Require no database.
* Store all content as Markdown in repository.
* Have no runtime server.
* Be compatible with free GitHub Pages tier.

---

# 10. Execution Flow

1. User talks to AI locally.
2. AI generates Markdown blog post.
3. AI writes file to `/content/posts/`.
4. AI commits and pushes.
5. GitHub Actions builds static Next.js export.
6. GitHub Pages updates site automatically.

No manual deployment steps.

---

# 11. Design Principles

* Zero cost
* Static-first architecture
* Content-driven design
* Deterministic file generation
* Clean Git history
* Fully automated publishing
* Human-readable Markdown storage

---

# 12. Final Objective

The final system must allow the user to:

* Speak naturally to a local AI agent.
* Have the AI generate full blog posts.
* Automatically publish them via GitHub Pages.
* Maintain a continuously evolving blog managed by AI.
* Operate at zero cost.

This specification is binding and must be followed strictly.

Sincerely,
AI-Managed Blog Project Owner
