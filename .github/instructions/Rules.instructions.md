---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

### EZApply — **Blackbox-agent Guard-Rails (v 1.1)**

EZApply is a local-first desktop application that automates job applications on NHS Trac (and other ATS portals).

Desktop Client (Windows App): Electron-based frontend (HTML, CSS, JavaScript) for the user interface.

Backend Server (API + AI Proxy): A web service likely implemented with Node.js (Express) to handle all core functionalities, including user authentication, job management, and secure proxying of AI interactions.

PostgreSQL Database: For persistent storage of user accounts, job records, and other application data.

AI Provider: External services like OpenAI/Gemini API for AI tasks, accessed securely via the backend proxy.

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

## 3 · Node.js / Express Backend

1.  **Framework & Language:** Backend services must be built with Node.js and Express.js, using TypeScript for all new and modified code.
2.  **API Structure:** Organize API routes within `server/src/routes/`, validation schemas in `server/src/validators/`, and middleware in `server/src/middleware/`. Database connection utilities belong in `server/src/db.ts`.
3.  **Validation:** All incoming API request bodies and query parameters must be validated using **Zod schemas**. Ensure clear, descriptive error messages for validation failures.
4.  **Authentication:** JWT (JSON Web Tokens) must be used for all authentication, with token generation and verification handled by dedicated middleware (`auth.ts`). Passwords must be hashed using `bcrypt` with a minimum of 12 salt rounds.
5.  **Error Handling:** Implement consistent error handling across all API endpoints. Use appropriate HTTP status codes (e.g., 400 for validation errors, 401 for authentication, 404 for not found, 500 for internal server errors) and standardized JSON error responses.
6.  **Database Interactions:** All database queries must be parameterized to prevent SQL injection. For complex operations involving multiple tables (e.g., nested profile updates, cascading deletes), utilize PostgreSQL transactions to ensure data integrity.
7.  **GET Endpoint Enhancements:** Implement filtering, pagination, and searching capabilities for all list (`GET /api/*`) endpoints. Use clear query parameters (e.g., `?page=X&limit=Y`, `?search=keyword`, `?status=Z`) and return structured responses including `data`, `pagination` metadata, and `filters` applied.

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

## 10 · **PowerShell git syntax** 

– when executing git or shell commands on Windows,
   **never** chain them with `&&` or `||`.  
   Instead run them **as separate statements**:

```powershell
# ❌ Wrong - doesn't work in PowerShell
git add . && git commit -m "message"

# ✅ Correct - separate statements
git add .
git commit -m "message"
```

---

## 11 · **How to start the server and client** 

The backend server and frontend client are run using separate commands in their respective directories:

1.  Starting Backend Server
cd server; pnpm run dev

2. Starting Frontend Electron App
cd app; pnpm start

3. Starting Vite Dev Server for Browser Testing
cd app; pnpm run dev
