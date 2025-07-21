---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

## 1 · Project Snapshot

| Area | Details |
|------|---------|
| **Name** | **EZApply** – AI-powered desktop app that auto-fills NHS Trac (and other ATS) job applications. |
| **Stack** | **React (TypeScript) + Tailwind + Tauri (Rust)** front-end shell · **Python + Playwright** automation · **PostgreSQL 16 (+ pgvector)** local DB · OpenAI GPT-4o & _text-embedding-3-small_. |
| **Execution** | Desktop-only binary (no web server). |
| **Directories** | `src/` (React) · `src-tauri/` (Rust) · `python/` (automation) · `migrations/` (SQL) · `assets/` (images) |
