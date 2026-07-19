# Personal Book Library

A full-stack personal book library with a React/Vite interface, an Express API, persistent SQLite storage through Prisma, and one-hour JWT authentication.

## Prerequisites and layout

- Node.js 22 or newer and npm 10 or newer
- Optional for API review: Bruno desktop or Bruno CLI (`bru.cmd` on Windows)
- `backend/` — Express, Prisma, SQLite, JWT authentication, and tests
- `frontend/` — React, Vite, guarded routes, library UI, and tests
- `api-collection/` — ordered Bruno acceptance collection

## Install and configure

From the repository root:

```powershell
npm.cmd install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Use `npm` instead of `npm.cmd` on macOS/Linux. PowerShell may block the `npm.ps1` shim on Windows, so the documented Windows commands use the `.cmd` executable.
The backend postinstall generates the ignored Prisma client. Before `.env` exists, Prisma configuration uses the same local `file:./dev.db` URL only so generation can complete; application startup still validates every required environment variable, and no database is created until the setup command below.

Backend variables in `backend/.env`:

| Variable | Meaning |
|---|---|
| `PORT` | Express listening port; the local default is `4000`. |
| `DATABASE_URL` | SQLite URL resolved from `backend/`; the local default creates `backend/dev.db`. |
| `JWT_SECRET` | Secret used to sign one-hour access tokens; it must contain at least 32 characters. |
| `CLIENT_ORIGIN` | Exact browser origin allowed by CORS; the Vite default is `http://localhost:5173`. |
| `SEED_USERNAME` | Username created or updated by the idempotent seed. |
| `SEED_PASSWORD` | Plain local password hashed with bcrypt cost 12 by the seed. |

`frontend/.env` contains `VITE_API_URL`, the browser-visible API prefix (`http://localhost:4000/api` locally).

The local values are reviewer/demo defaults only. Before production, replace the username, password, and JWT secret with strong private values, keep all `.env` files out of Git, and use a production database and deployment-specific origins.

## Create and seed the local database

This repository tracks its initial migration at `backend/prisma/migrations/0_init/migration.sql`. Prisma 7's Windows schema engine cannot create a missing SQLite file by itself, so the repository wrapper safely creates only the configured file (without truncating an existing database) and then applies tracked migrations:

```powershell
npm.cmd run prisma:setup --workspace backend
npm.cmd run prisma:seed --workspace backend
```

The seed is idempotent and creates/updates the configured reviewer account. If the Prisma schema intentionally changes, regenerate the tracked baseline with `npm.cmd run prisma:migration:generate --workspace backend`, review the SQL, and rerun setup. Do not run the reset-enabled test database command against development data; reset is hard-limited to `backend/test.db`.

## Run locally

```powershell
npm.cmd run dev
```

- Frontend: `http://localhost:5173`
- Backend API prefix: `http://localhost:4000/api`
- Backend readiness log: `Book library server is up and ready to roll on port 4000`

Local reviewer credentials:

- Username: `reviewer`
- Password: `LibraryDemo123!`

## Quality gates

Run these from the repository root:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Backend tests prepare and reset only the ignored `backend/test.db`. The backend build generates its ignored Prisma client before TypeScript compilation; the frontend build type-checks and produces the ignored Vite bundle.

## Bruno acceptance flow

With the seeded backend running, open `api-collection/bruno.json` in Bruno, select the `local` environment, and run these requests in order:

1. `Auth/Login.bru` — stores `token`
2. `Books/List.bru`
3. `Books/Create.bru` — stores `bookId`
4. `Books/Delete.bru`
5. `Books/Create without token.bru`

CLI equivalent from the repository root (quote the filename containing spaces):

```powershell
Push-Location api-collection
try {
  bru.cmd run Auth/Login.bru Books/List.bru Books/Create.bru Books/Delete.bru "Books/Create without token.bru" --env local --bail
} finally {
  Pop-Location
}
```

Expected status sequence: `200, 200, 201, 204, 401`, with all Bruno tests passing. The collection's `token` and `bookId` are runtime variables; no token or secret is written to the repository.

## API

| Method | Path | Authentication | Success | Behavior |
|---|---|---|---|---|
| `POST` | `/api/login` | None | `200` | Validates credentials and returns `{ token, user }`. Invalid credentials return `401`. |
| `GET` | `/api/books` | Bearer JWT | `200` | Returns `{ books: [...] }`, newest first. |
| `POST` | `/api/books` | Bearer JWT | `201` | Validates `title`, `author`, and `category`; returns `{ book }`. |
| `DELETE` | `/api/books/:id` | Bearer JWT | `204` | Deletes an existing numeric id; a missing book returns `404`. |

Every `/api/books` route requires `Authorization: Bearer <token>`. A missing, malformed, invalid, or expired token returns HTTP `401` with `{ "error": "Access denied: session credential missing or expired" }`. The frontend centrally clears its saved token and returns to Login after any API `401`.

## Residual browser review

Automated React tests cover the guarded route, login persistence, loading/empty/error states, create focus and form clearing, search across all fields, optimistic mutation behavior, and central `401` logout. Before production or grading, also perform a real-browser keyboard and visual pass at mobile and desktop widths; this is intentionally not claimed by the automated gates.
