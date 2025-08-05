# VERY IMPORTANT: Ensure all changes are project-wide and follow best practices

1. When a change or fix is applied to a file, first consider the potential impact on other parts of the project.
2. After making any change, re-evaluate the entire code file for consistency and correctness.
3. Actively check for and resolve any new or existing linting errors that are present in the modified code.
4. Ensure that any code added or modified is compatible with the project's existing structure, dependencies, and styling rules.
5. Do not consider the task complete until the code is fully functional, free of linting errors, and integrated into the project without new issues.
# Copilot Instructions for EZApply

## Project Architecture
- **EZApply** is a local-first desktop app for automating job applications, built with React (Material-UI v6, Refine v4) in an Electron shell, and a Node.js/Express backend (TypeScript) with PostgreSQL (Docker).

## Backend Application Blueprint
- **Node.js/Express (TypeScript)** REST API:
    - API routes: `server/src/routes/` (auth, profile, jobs, applications)
    - Validation: Zod schemas in `server/src/validators/`
    - Middleware: JWT authentication, error handling, rate limiting in `server/src/middleware/`
    - DB connection: `server/src/db.ts` (PostgreSQL 16, Docker container `ez-db`)
- All requests validated with Zod; passwords hashed with bcrypt (≥12 rounds).
- JWT for authentication; tokens managed via middleware.
- Database queries are parameterized; multi-table ops use transactions.
- API endpoints:
    - `/api/profile` (GET, PUT)
    - `/api/jobs` (CRUD)
    - `/api/applications` (CRUD)
    - Nested endpoints for employment, education, references
- All schema changes via migration files in `migrations/` only.
- AI calls (OpenAI, Gemini, Claude, Ollama) proxied through backend; embeddings use `text-embedding-3-small`.
- Logging: JSON lines with `timestamp`, `level`, `message`, `context` in `~/EZApply/logs/YYYY-MM-DD.log`.
- Security: Manual portal login, encrypted API keys, rate-limited automation, duplicate detection.

## Frontend Application Blueprint (Electron + React + Refine)

### Navigation Layout
- Persistent shell layout:
    - Navbar (top): app name/logo, user avatar + dropdown (profile, password, logout)
    - Sidebar (left, collapsible via Zustand): Home, My Profile, Jobs, Applications, Settings
    - Sidebar collapse state managed in Zustand (`isSidebarCollapsed`)

### Pages & Routing
- Dashboard (`/dashboard`):
    - Cards: total applications, in-progress, recent activity, quick action (start new application)
    - Data via Refine DataProvider from `/api/applications`, `/api/jobs`
- Profile (`/profile`):
    - Editable form: forename, surname, email, location, phone
    - Nested resources: employment, education, references (CRUD via Refine <Resource>)
- Jobs (`/jobs`):
    - Discovered jobs (scraping/manual), job builder, status tracking
- Applications (`/applications`):
    - Table of automation runs, status, ATS, date, result, AI-generated responses
- Settings:
    - Theme toggle, model selector, logging toggle, password change, future notification/data export

### Core Components
- Atomic design in `/components/`:
    - Navbar.tsx, Sidebar.tsx, Layout.tsx (Navbar+Sidebar+Outlet)
    - JobCard.tsx, ApplicationRow.tsx, ProfileEditor.tsx (Zod schema forms)
- Pages in `/pages/`, using Refine <Resource> routing and hooks (`useList`, `useForm`, etc.)

### State & Providers
- AuthProvider: JWT token in memory or secure-electron-store
- DataProvider/AuthProvider: targets `http://localhost:4000/api`
- Zustand store: sidebar state, user info, theme

### Build Plan (Frontend MVP)
1. Scaffold shell (Electron+Vite+React+Refine+MUI)
2. Implement auth flow (login/register, AuthProvider)
3. Resource routing via Refine (profile, jobs, applications)
4. Dashboard page (aggregate stats, metric cards)

## Developer Workflows
- **Start Backend:** `cd server; pnpm run dev` (run in visible terminal)
- **Start Frontend:** `cd app; pnpm start` (run in visible terminal)
- **Dev Hot Reload:** Frontend: `npm run tauri dev`. Backend: `cargo watch -q -x run` (dev only).
- **Lint/Test:** All PRs must pass `pnpm lint` and `pnpm test`.
- **Git on Windows:** Never chain commands with `&&` or `||`. Run as separate statements.
- **Secrets:** Never commit API keys (e.g., `sk-...`).

## Patterns & Conventions
- **React:** Use Refine's form hooks for all forms. Use MUI's `sx` prop for styling. Avatar upload fields should use `useController` or `useWatch` from Refine/react-hook-form.
- **Backend:** Validate all requests with Zod. Use parameterized queries and transactions for multi-table ops. JWT for auth, bcrypt (≥12 rounds) for passwords.
- **Database:** Never drop/truncate key tables. Connection string from `env("DATABASE_URL")`.
- **Playwright:** All selectors in `python/selectors.py`. No inline XPath.
- **Logging:** JSON lines with `timestamp`, `level`, `message`, `context`. Logs in `~/EZApply/logs/YYYY-MM-DD.log`.
- **Screenshots:** Max 1920×1080 px.
- **Screen Overlay:** CSS classes prefixed `ez-`. Colors: green `#24c96b`, amber `#ffc857`, red `#ff4d4f`.

## Integration Points
- **AI/NLP:** Calls routed via backend proxy. Embedding model: `text-embedding-3-small`. Never log raw résumé text—hash before logging.
- **Storage:** All structured data in Postgres. Files referenced by absolute path. Storage layout under `~/EZApply/`.
- **Security:** Manual portal login, encrypted API keys, rate-limited automation, duplicate detection.

## Example File References
- `app/src/pages/auth/ProfileEdit.tsx`: Refine TabbedForm, MUI icons, avatar upload pattern.
- `server/src/routes/`: API endpoints.
- `migrations/`: SQL migration files.
- `.github/instructions/rules.md`: Full coding guardrails and workflow rules.
- `README.md`: Architecture, tech stack, and workflow overview.

## MUI Docs Server
- For advanced MUI questions, use the `mui-mcp` server and follow `.github/instructions/mui.md` for doc retrieval.

## Git Commit & Push Rules

- **Always push changes to GitHub from the root directory** due to the monorepo structure.
- **Commit messages must use Conventional Commits format:**

  Format: `type(scope): subject`

  - **type:**
    - feat: New feature
    - fix: Bug fix
    - docs: Documentation
    - style: Formatting only
    - refactor: Code refactor
    - test: Add/correct tests
    - build: Build system/deps
    - ci: CI config/scripts
    - perf: Performance improvement
    - chore: Other changes
  - **scope (optional):** e.g., (backend), (frontend), (ui), (auth), (profile)
  - **subject:** Brief, imperative, capitalized, no period

  **Example:**
  ```
  feat(ui): Enhance frontend with MUI icons and global theme
  ```

  You may add bullet points for extra context:
  ```
  feat: Integrate Amazon SES for email verification

  This commit introduces Amazon Simple Email Service (SES) for sending user email verification codes, replacing the previous console-based mock service.

  Key changes and resolved issues include:
  - **SES Client Setup:** Configured `@aws-sdk/client-ses` in `server/src/services/email.ts` to connect to AWS SES.
  - **Environment Variables:** Added `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `SES_FROM_EMAIL` to the `server/.env` file for secure credential management.
  - **Resolved Invalid Credentials:** Fixed an `InvalidClientTokenId` error by correcting the AWS Access Key and Secret Access Key in the `.env` configuration.
  - **Improved Registration Flow (Bug Fix):** Addressed a logical bug where users were created in the database even if the verification email failed to send (`ghost user` problem). The `POST /auth/register` endpoint now attempts to send the verification email *before* persisting the user to the database. If email sending fails, the user record is not created.
  - **SES Sandbox Compliance:** Ensured successful email delivery in AWS SES sandbox mode by verifying both the sender and recipient email identities in the SES console.
  ```

---

If any section is unclear or missing, please provide feedback so this guide can be improved for future AI agents.
