---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.



## 0 · Golden principle

**The agent must never execute an irreversible command without first printing**

```
COMMAND PREVIEW — PROCEED? (yes/no)
```

and then waiting for an explicit `yes` from me.

---

## 1 · Repository & file-system safety

1. **Write-only scope** – restrict all edits to the project root. Never reference absolute paths outside `EZApply/`.
2. **No destructive commands** – disallow `rm -rf`, `git reset --hard`, `git clean -fdx`, `docker volume rm`, `dropdb`, `psql -c "DROP…"`.
3. **Secrets protection** – never output or commit any string matching `sk-` or other API keys. Keep `data_folder/secrets.yaml` in `.gitignore`.
4. **Commit hygiene** – *one logical change per commit* (see commit-message rule below) and run `gitleaks protect --staged`; abort push on failure.
5. **Branch discipline** – work only on `dev`; no force-pushes to `main`. If a history rewrite is required, stop and ask.

---

## 2 · Database rules (PostgreSQL + Docker)

1. Container name must be `ez-db`.
2. Schema changes **must** be expressed as SQL migration files in `migrations/` and applied with `sqlx migrate run`; direct DDL via `psql` is forbidden.
3. Never drop or truncate `profile`, `stories`, or `generated_answers` tables.
4. Connection string read from `env("DATABASE_URL")`, never hard-coded.

---

## 3 · Python & Playwright

1. Use the existing virtual-env `.venv`; do **not** create another.
2. Pin new packages in `requirements.txt` with exact versions; update via `pip-compile`.
3. All Playwright selectors live in `python/selectors.py`; no inline XPath in logic.
4. Every new Python module needs at least one `pytest` test (mocked is fine).

---

## 4 · Rust / Tauri backend

1. New commands go in `src-tauri/src/commands/` and are registered with `tauri::generate_handler!`.
2. Do not alter icon paths in `tauri.conf.json` unless I request it.
3. Dev-only code wrapped in `#[cfg(debug_assertions)]`.

---

## 5 · React / Tailwind front-end

1. Components in `src/components/`; pages under `src/pages/`.
2. State manager: **zustand** only.
3. UI primitives: **shadcn/ui** – do not import MUI, Ant, etc.
4. Keep Tailwind class list ≤ 5 per element; extract longer lists to helper strings.
5. All PRs must pass `npm run lint` and `npm run test`.

---

## 6 · AI & embedding calls

1. Read the OpenAI key from `process.env.OPENAI_API_KEY`.
2. Embedding model fixed to `text-embedding-3-small`.
3. Abort generation if prompt + completion > 4 000 tokens; ask me first.
4. Do not log raw résumé text—hash it before writing logs.

---

## 7 · Screen overlay rules

1. No external script injection; use Playwright `evaluate` only.
2. Overlay CSS classes must be prefixed `ez-`.
3. Colour codes: `#24c96b` (green), `#ffc857` (amber), `#ff4d4f` (red).

---

## 8 · Dev-mode hot reload

1. Front-end watch: `npm run tauri dev`.
2. Backend watch: `cargo watch -q -x run` allowed *only* in dev, never in production scripts.

---

## 9 · Logging & analytics

1. Log format: JSON lines with `timestamp`, `level`, `message`, `context`.
2. Logs stored under `~/EZApply/logs/YYYY-MM-DD.log`.
3. Screenshots must not exceed 1920 × 1080; resize beforehand.

---

## 10 · **Commit-message template (new rule)**

All commits must follow **Conventional Commits** in imperative English:

```
<type>(<scope>): <short summary>

Body (72-char wrap):
- Explain what and **why**, not how.
- Reference issue if relevant, e.g. Closes #24.

Footer (optional):
BREAKING CHANGE: something major
```

Allowed **type** values: `feat | fix | docs | style | refactor | test | build | chore`.
*Scope* is optional; use folder or component name (`react`, `tauri`, `db`).
Example:

```
feat(react): add resume drag-and-drop panel
```

If unsure of the correct type, default to `chore:`.

---

**If any rule conflicts with a new task, the agent must stop and ask for clarification before proceeding.**

---
