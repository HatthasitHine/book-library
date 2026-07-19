# Personal Book Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tested full-stack personal book library with persistent SQLite data, JWT authentication, protected CRUD operations, searchable React UI, and complete reviewer documentation.

**Architecture:** An npm-workspaces monorepo contains a React/Vite frontend and an Express backend. Express delegates validation to Zod, authentication to bcrypt/JWT services, and persistence to Prisma/SQLite; React uses one centralized fetch client and auth provider so Bearer-token and 401 behavior stay consistent.

**Tech Stack:** Node.js 22+, npm 10+, TypeScript, React, Vite, React Router, Express, Prisma, SQLite, Zod, bcryptjs, jsonwebtoken, Vitest, Supertest, React Testing Library, MSW, Bruno

## Global Constraints

- Deadline: within 7 calendar days from receipt of the assignment.
- Frontend must use React.js or Next.js; this plan uses React.js with Vite.
- Backend must use Node.js + Express and connect to a real database; this plan uses Prisma + SQLite.
- Required endpoints are `GET /api/books`, `POST /api/books`, `DELETE /api/books/:id`, and `POST /api/login`.
- Every `/api/books` endpoint requires `Authorization: Bearer <token>`; missing, invalid, or expired credentials return HTTP 401.
- JWT expires after `1h`; a frontend HTTP 401 removes the saved token and returns the user to Login.
- Frontend must demonstrate `useState`, mount/update `useEffect`, `useRef`, `useMemo`, and props through separate components.
- Include the exact comment `// ref: 37aa88161f` in the principal backend, frontend, backend-auth, and frontend-token implementation files.
- Submission includes unsquashed commit history, Bruno `.bru` collection, complete `README.md`, and a personal `REFLECTION.md` no longer than 10 lines.
- Never commit `.env`, real secrets, SQLite database files, coverage, or build output.
- Work one checkbox at a time; do not mark a step complete until its expected result is observed.

---

## Planned file map

| Area | Files | Responsibility |
|---|---|---|
| Workspace | `package.json`, `.gitignore`, `START-HERE.md` | Shared scripts, ignored artifacts, daily workflow |
| Backend boot | `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/config/env.ts` | Express composition, listener, validated configuration |
| Data | `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`, `backend/src/db/prisma.ts` | User/Book schema, reviewer user, Prisma lifecycle |
| Auth | `backend/src/modules/auth/*`, `backend/src/auth/*`, `backend/src/middleware/authenticate.ts` | Login, password comparison, JWT issue/verify, route protection |
| Books | `backend/src/modules/books/*` | Validated list/create/delete behavior |
| Frontend transport | `frontend/src/api/*` | Typed contracts, Bearer header, centralized 401 handling |
| Frontend auth | `frontend/src/auth/*`, `frontend/src/pages/LoginPage.tsx` | Token persistence, login/logout, route guard |
| Frontend library | `frontend/src/pages/LibraryPage.tsx`, `frontend/src/components/*` | Loading, search, form, list, mutation feedback and focus |
| Presentation | `frontend/src/styles/index.css` | Responsive visual tokens, focus, reduced motion |
| Verification | `backend/tests/*`, `frontend/src/**/*.test.tsx`, `api-collection/*` | Automated and reviewer-facing checks |
| Handoff | `README.md`, `REFLECTION.md` | Reproducible setup and personal reflection |

---

### Task 1: Workspace foundation and quality gates

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/server.ts`
- Create: `frontend/package.json` and Vite-generated TypeScript config files
- Create: `frontend/vite.config.ts`

**Interfaces:**
- Produces: root commands `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`
- Produces: backend import alias-free ESM TypeScript and frontend Vite React TypeScript runtime
- Consumes: Node.js `>=22` and npm `>=10`

- [ ] **Step 1: Initialize Git and scaffold both workspaces**

Run:

```powershell
git init
npm init -y
npm create vite@latest frontend -- --template react-ts
New-Item -ItemType Directory -Force backend/src,backend/tests
npm init -w backend -y
```

Expected: `.git/`, `frontend/`, `backend/`, root `package.json`, and both workspace package files exist.

- [ ] **Step 2: Install runtime and test dependencies**

Run:

```powershell
npm install -D concurrently
npm install --workspace backend express cors dotenv zod bcryptjs jsonwebtoken @prisma/client
npm install -D --workspace backend typescript tsx prisma vitest supertest cross-env @types/node @types/express @types/cors @types/jsonwebtoken @types/supertest
npm install --workspace frontend react-router-dom
npm install -D --workspace frontend vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

Expected: one root `package-lock.json`; dependencies are recorded in the correct workspaces.

- [ ] **Step 3: Configure root scripts and ignored artifacts**

Set root `package.json` to include:

```json
{
  "name": "personal-book-library",
  "private": true,
  "workspaces": ["backend", "frontend"],
  "scripts": {
    "dev": "concurrently -n backend,frontend -c blue,magenta \"npm run dev --workspace backend\" \"npm run dev --workspace frontend\"",
    "test": "npm test --workspace backend && npm test --workspace frontend",
    "typecheck": "npm run typecheck --workspace backend && npm run typecheck --workspace frontend",
    "build": "npm run build --workspace backend && npm run build --workspace frontend"
  },
  "engines": { "node": ">=22", "npm": ">=10" }
}
```

Create `.gitignore`:

```gitignore
node_modules/
.env
.env.*
!.env.example
*.db
*.db-journal
dist/
coverage/
frontend/.vite/
*.log
.DS_Store
```

Keep Prisma migrations tracked; only the generated lock line above is ignored.

- [ ] **Step 4: Configure backend and frontend quality commands**

Use these backend scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/src/server.js",
    "test:db": "cross-env DATABASE_URL=file:./test.db prisma db push --skip-generate",
    "test": "npm run test:db && vitest run",
    "test:watch": "npm run test:db && vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

Use these frontend scripts in addition to Vite defaults:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --pretty false"
  }
}
```

Configure backend Vitest with `environment: "node"`, `setupFiles: "./tests/setup.ts"`; configure frontend Vitest with `environment: "jsdom"`, `setupFiles: "./src/test/setup.ts"`.

Use this backend `tsconfig.json` so source, seed, config, and tests share strict type rules:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "prisma/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create the first real backend constant in `backend/src/server.ts` so the empty workspace compiles and the assignment's required ready message is locked before server composition:

```ts
export const SERVER_READY_MESSAGE = "Book library server is up and ready to roll";
```

- [ ] **Step 5: Run initial quality gates**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit 0; Vite starter builds and empty backend project type-checks.

- [ ] **Step 6: Commit the workspace foundation**

```powershell
git add package.json package-lock.json .gitignore backend frontend START-HERE.md docs
git commit -m "chore: initialize full-stack book library workspace"
```

Expected: clean worktree after commit.

---

### Task 2: Validated configuration, Prisma schema, and reviewer seed

**Files:**
- Create: `backend/.env.example`
- Create: `backend/src/config/env.ts`
- Create: `backend/src/db/prisma.ts`
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`
- Create: `backend/tests/setup.ts`
- Create: `backend/tests/database.test.ts`

**Interfaces:**
- Produces: `env` with `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `SEED_USERNAME`, `SEED_PASSWORD`
- Produces: singleton `prisma: PrismaClient`
- Produces: Prisma models `User` and `Book`

- [ ] **Step 1: Write the failing persistence test**

Create `backend/tests/database.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";

describe("Book persistence", () => {
  beforeEach(async () => prisma.book.deleteMany());

  it("stores a normalized book record", async () => {
    const book = await prisma.book.create({
      data: { title: "Dune", author: "Frank Herbert", category: "Science fiction" },
    });
    expect(book).toMatchObject({ title: "Dune", author: "Frank Herbert", category: "Science fiction" });
    expect(book.id).toEqual(expect.any(Number));
  });
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

Run: `npm test --workspace backend -- database.test.ts`  
Expected: FAIL because `src/db/prisma.ts` and Prisma model are not defined.

- [ ] **Step 3: Define environment and schema**

Create `backend/.env.example`:

```dotenv
PORT=4000
DATABASE_URL=file:./dev.db
JWT_SECRET=local-review-secret-change-before-production-2026
CLIENT_ORIGIN=http://localhost:5173
SEED_USERNAME=reviewer
SEED_PASSWORD=LibraryDemo123!
```

In `env.ts`, load dotenv and parse with this exact shape:

```ts
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CLIENT_ORIGIN: z.string().url(),
  SEED_USERNAME: z.string().min(3),
  SEED_PASSWORD: z.string().min(8),
});
export const env = EnvSchema.parse(process.env);
```

Define `User` and `Book` in `schema.prisma` using the fields and limits documented in the design spec; use SQLite provider and `env("DATABASE_URL")`.

Create `backend/tests/setup.ts` so test imports always receive deterministic local-only configuration:

```ts
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_SECRET = "test-only-jwt-secret-with-at-least-32-characters";
process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.SEED_USERNAME = "reviewer";
process.env.SEED_PASSWORD = "LibraryDemo123!";
```

- [ ] **Step 4: Add Prisma singleton and idempotent seed**

Export `prisma = new PrismaClient()` from `src/db/prisma.ts`. In `prisma/seed.ts`, hash `SEED_PASSWORD` with bcrypt cost 12 and upsert by `username`:

```ts
const passwordHash = await hash(env.SEED_PASSWORD, 12);
await prisma.user.upsert({
  where: { username: env.SEED_USERNAME },
  update: { passwordHash },
  create: { username: env.SEED_USERNAME, passwordHash },
});
```

- [ ] **Step 5: Generate and migrate a clean database**

Run:

```powershell
Copy-Item backend/.env.example backend/.env
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend -- --name init
npm run prisma:seed --workspace backend
npm test --workspace backend -- database.test.ts
```

Expected: migration and seed succeed; persistence test PASS.

- [ ] **Step 6: Commit the data foundation**

```powershell
git add backend/.env.example backend/prisma backend/src/config backend/src/db backend/tests
git commit -m "feat: add persistent book library database"
```

Expected: `.env` and `dev.db` remain untracked/ignored.

---

### Task 3: JWT login and authentication middleware

**Files:**
- Create: `backend/src/auth/password.ts`
- Create: `backend/src/auth/token.ts`
- Create: `backend/src/modules/auth/auth.schema.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/auth/auth.routes.ts`
- Create: `backend/src/middleware/authenticate.ts`
- Create: `backend/src/types/express.d.ts`
- Create: `backend/tests/auth.test.ts`

**Interfaces:**
- Produces: `comparePassword(password: string, hash: string): Promise<boolean>`
- Produces: `signAccessToken(user: { id: number; username: string }): string`
- Produces: `verifyAccessToken(token: string): { sub: string; username: string }`
- Produces: `authenticateCredentials(input: LoginInput): Promise<{ id: number; username: string } | null>`
- Produces: `authenticate(req, res, next)` and `req.auth = { userId: number; username: string }`
- Produces: `authRouter` serving `POST /login`

- [ ] **Step 1: Write failing auth tests**

Create Supertest cases in `backend/tests/auth.test.ts` asserting:

```ts
it("returns a JWT for valid reviewer credentials", async () => {
  const response = await request(app).post("/api/login").send({ username: "reviewer", password: "LibraryDemo123!" });
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ token: expect.any(String), user: { username: "reviewer" } });
});

it.each([
  { username: "reviewer", password: "wrong-password" },
  { username: "missing", password: "LibraryDemo123!" },
])("rejects invalid credentials without revealing which field failed", async (credentials) => {
  const response = await request(app).post("/api/login").send(credentials);
  expect(response.status).toBe(401);
  expect(response.body).toEqual({ error: "Invalid username or password" });
});
```

Also test missing fields return 400 and `authenticate` rejects absent, malformed, invalid, and expired tokens with the exact shared 401 body.

Build a local test-only Express app in this file so Task 3 does not depend on the production app composed in Task 4:

```ts
const app = express();
app.use(express.json());
app.use("/api", authRouter);
app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof ZodError) return res.status(400).json({ error: "Invalid request", details: error.flatten() });
  next(error);
});
```

Seed the reviewer with a bcrypt hash in `beforeAll` and delete test users/books in `afterAll`.

- [ ] **Step 2: Run auth tests and confirm RED**

Run: `npm test --workspace backend -- auth.test.ts`  
Expected: FAIL because `app`, route, and token helpers do not exist.

- [ ] **Step 3: Implement password and token helpers**

Use `bcryptjs.compare`, `jsonwebtoken.sign`, and `jsonwebtoken.verify`; force algorithm `HS256`, issuer `personal-book-library`, audience `book-library-web`, and `expiresIn: "1h"`. Convert numeric user id to `sub: String(user.id)` and reject non-numeric `sub` during verification.

- [ ] **Step 4: Implement login schema, service, and route**

`LoginInputSchema` accepts trimmed username and non-empty password. `authenticateCredentials` looks up by username, returns `null` for both unknown user and password mismatch, and returns `{ id, username }` only on match. The route returns the same response for either invalid-credential case and includes:

```ts
// ref: 37aa88161f
authRouter.post("/login", async (req, res) => {
  const credentials = LoginInputSchema.parse(req.body);
  const user = await authenticateCredentials(credentials);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  res.status(200).json({ token: signAccessToken(user), user: { username: user.username } });
});
```

- [ ] **Step 5: Implement Bearer authentication middleware**

Parse exactly two Authorization segments, require case-insensitive `Bearer`, verify the token, assign `req.auth`, and use this response for every credential failure:

```ts
res.status(401).json({ error: "Access denied: session credential missing or expired" });
```

Add Express request declaration merging in `src/types/express.d.ts`.

- [ ] **Step 6: Run focused tests and type-check**

Run:

```powershell
npm test --workspace backend -- auth.test.ts
npm run typecheck --workspace backend
```

Expected: all auth cases PASS and type-check exits 0.

- [ ] **Step 7: Commit authentication**

```powershell
git add backend/src/auth backend/src/modules/auth backend/src/middleware backend/src/types backend/tests/auth.test.ts
git commit -m "feat: authenticate reviewers with expiring JWTs"
```

---

### Task 4: Express app and protected book API

**Files:**
- Create: `backend/src/modules/books/book.schema.ts`
- Create: `backend/src/modules/books/book.service.ts`
- Create: `backend/src/modules/books/book.routes.ts`
- Create: `backend/src/middleware/error-handler.ts`
- Create: `backend/src/app.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/tests/books.test.ts`

**Interfaces:**
- Produces: `app: Express` without opening a port, for Supertest
- Produces: `listBooks(): Promise<Book[]>`, `createBook(input): Promise<Book>`, `deleteBook(id): Promise<boolean>`
- Produces: protected `GET /api/books`, `POST /api/books`, `DELETE /api/books/:id`
- Consumes: `authenticate` and `prisma` from Tasks 2–3

- [ ] **Step 1: Write failing protected CRUD tests**

Create table-driven unauthorized tests for all three book routes and happy-path tests using a token from `/api/login`. Store the token in `let token: string` during `beforeAll`, then use `const authHeader = () => ({ Authorization: `Bearer ${token}` })`. Required assertions:

```ts
expect((await request(app).get("/api/books").set(authHeader())).body).toEqual({ books: [] });

const created = await request(app).post("/api/books").set(authHeader()).send({
  title: " Dune ", author: " Frank Herbert ", category: " Science fiction ",
});
expect(created.status).toBe(201);
expect(created.body.book).toMatchObject({ title: "Dune", author: "Frank Herbert", category: "Science fiction" });

expect((await request(app).delete(`/api/books/${created.body.book.id}`).set(authHeader())).status).toBe(204);
expect((await request(app).delete("/api/books/999999").set(authHeader())).status).toBe(404);
```

Also assert blank/over-limit fields and non-positive/non-integer ids return 400.

- [ ] **Step 2: Run CRUD tests and confirm RED**

Run: `npm test --workspace backend -- books.test.ts`  
Expected: FAIL with missing book modules/routes.

- [ ] **Step 3: Implement book validation and service**

Use Zod transformed strings:

```ts
export const BookInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
});
export const BookIdSchema = z.coerce.number().int().positive();
```

`listBooks` uses `orderBy: { createdAt: "desc" }`; `deleteBook` uses `deleteMany({ where: { id } })` and returns `count === 1` so missing ids do not become unhandled Prisma exceptions.

- [ ] **Step 4: Implement protected routes**

Apply `authenticate` at router level and include the reference marker:

```ts
// ref: 37aa88161f
bookRouter.use(authenticate);
bookRouter.get("/", ...);
bookRouter.post("/", ...);
bookRouter.delete("/:id", ...);
```

Return `200 { books }`, `201 { book }`, `204` without body, and `404 { error: "Book not found" }` according to the contract.

- [ ] **Step 5: Compose Express app and server**

`app.ts` installs `cors({ origin: env.CLIENT_ORIGIN })`, `express.json({ limit: "16kb" })`, auth router, book router, 404 JSON fallback, then error handler. `server.ts` imports app, listens on `env.PORT`, and logs exactly:

```ts
console.log(`${SERVER_READY_MESSAGE} on port ${env.PORT}`);
```

Handle Zod errors as 400 without stack; unexpected errors as 500 with `{ error: "Internal server error" }`. Import `SERVER_READY_MESSAGE` from the Task 1 file and append ` on port ${env.PORT}` when logging.

- [ ] **Step 6: Run the entire backend gate**

Run:

```powershell
npm test --workspace backend
npm run typecheck --workspace backend
npm run build --workspace backend
```

Expected: database, auth, and books tests PASS; type-check and build exit 0.

- [ ] **Step 7: Commit the protected API**

```powershell
git add backend/src backend/tests
git commit -m "feat: add protected book management API"
```

---

### Task 5: Frontend API client, authentication state, and guarded routing

**Files:**
- Create: `frontend/.env.example`
- Create: `frontend/src/api/types.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/auth/AuthProvider.tsx`
- Create: `frontend/src/auth/ProtectedRoute.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/pages/LoginPage.test.tsx`

**Interfaces:**
- Produces: `apiRequest<T>(path: string, init?: RequestInit): Promise<T>`
- Produces: `loginRequest(credentials): Promise<{ token: string; user: { username: string } }>`
- Produces: `useAuth(): { token, username, login, logout }`
- Produces: protected `/books` and public `/login` routes

- [ ] **Step 1: Write failing authentication UI tests**

With MSW and a memory router, assert:

```tsx
expect(await screen.findByRole("heading", { name: "เข้าสู่คลังหนังสือ" })).toBeInTheDocument();
await user.type(screen.getByLabelText("ชื่อผู้ใช้"), "reviewer");
await user.type(screen.getByLabelText("รหัสผ่าน"), "LibraryDemo123!");
await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
expect(localStorage.getItem("book-library-token")).toBe("valid.jwt.token");
expect(await screen.findByRole("heading", { name: "คลังหนังสือของฉัน" })).toBeInTheDocument();
```

Add cases for invalid credentials, unauthenticated `/books` redirect, and explicit logout clearing storage.

- [ ] **Step 2: Run Login tests and confirm RED**

Run: `npm test --workspace frontend -- LoginPage.test.tsx`  
Expected: FAIL because auth modules and page are absent.

- [ ] **Step 3: Add typed transport with centralized unauthorized handling**

Set `VITE_API_URL=http://localhost:4000/api` in `frontend/.env.example`. `apiRequest` reads `book-library-token`, attaches `Authorization: Bearer ...` when present, sets JSON content type only when a body exists, returns `undefined` for HTTP 204, and otherwise parses JSON. On 401 it clears both `book-library-token` and `book-library-username`, then dispatches a browser `book-library:unauthorized` event; other non-2xx responses throw an `ApiError` containing the server `{ error }` message.

- [ ] **Step 4: Implement AuthProvider**

Initialize token and username state synchronously from localStorage, persist both on `login`, clear both on `logout`, and subscribe/unsubscribe to the unauthorized event in `useEffect`. Include:

```tsx
// ref: 37aa88161f
const TOKEN_KEY = "book-library-token";
const USERNAME_KEY = "book-library-username";
```

Do not decode the JWT in the browser as proof of validity; Backend 401 is authoritative.

- [ ] **Step 5: Implement Login page and route guard**

Use controlled username/password state, `submitting`, and `error`. Disable submit while pending. `ProtectedRoute` redirects missing-token users to `/login` with route state message “กรุณาเข้าสู่ระบบก่อนใช้งาน”. After successful login navigate with `{ replace: true }` to `/books`.

- [ ] **Step 6: Compose application routes**

`main.tsx` wraps `BrowserRouter` and `AuthProvider`. `App.tsx` maps `/login`, protected `/books`, and catch-all redirect. Use a temporary semantic `<h1>คลังหนังสือของฉัน</h1>` for the library route until Task 6.

- [ ] **Step 7: Run frontend auth gate**

Run:

```powershell
npm test --workspace frontend -- LoginPage.test.tsx
npm run typecheck --workspace frontend
```

Expected: auth tests PASS and type-check exits 0.

- [ ] **Step 8: Commit frontend authentication**

```powershell
git add frontend/.env.example frontend/src
git commit -m "feat: add guarded JWT login flow"
```

---

### Task 6: Searchable library UI, mutations, hooks, and focus behavior

**Files:**
- Create: `frontend/src/api/books.ts`
- Create: `frontend/src/components/BookForm.tsx`
- Create: `frontend/src/components/BookList.tsx`
- Create: `frontend/src/components/BookSearch.tsx`
- Create: `frontend/src/components/StatusMessage.tsx`
- Create: `frontend/src/pages/LibraryPage.tsx`
- Create: `frontend/src/pages/LibraryPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `listBooks(): Promise<Book[]>`, `createBook(input: BookInput): Promise<Book>`, `deleteBook(id: number): Promise<void>`
- Produces: `BookForm({ onCreate, disabled })`, `BookList({ books, onDelete, deletingId })`, `BookSearch({ value, onChange, resultCount })`
- Consumes: `apiRequest`, `useAuth`, and protected `/books` route

- [ ] **Step 1: Write failing library behavior tests**

Use MSW to test these visible behaviors separately:

```tsx
expect(screen.getByText("กำลังเปิดบัตรรายการ…")).toBeInTheDocument();
expect(await screen.findByText("Dune")).toBeInTheDocument();

await user.type(screen.getByLabelText("ชื่อหนังสือ"), "The Left Hand of Darkness");
await user.type(screen.getByLabelText("ผู้เขียน"), "Ursula K. Le Guin");
await user.type(screen.getByLabelText("หมวดหมู่"), "Science fiction");
await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));
expect(await screen.findByText("เพิ่มหนังสือแล้ว")).toBeInTheDocument();
expect(screen.getByLabelText("ชื่อหนังสือ")).toHaveValue("");
expect(screen.getByLabelText("ชื่อหนังสือ")).toHaveFocus();
```

Also assert delete updates immediately, failed mutation shows actionable error, empty state appears, and search matches title/author/category case-insensitively without changing the source array.

- [ ] **Step 2: Run Library tests and confirm RED**

Run: `npm test --workspace frontend -- LibraryPage.test.tsx`  
Expected: FAIL because library modules and components are absent.

- [ ] **Step 3: Implement typed books API**

Define:

```ts
export type Book = { id: number; title: string; author: string; category: string; createdAt: string };
export type BookInput = Pick<Book, "title" | "author" | "category">;
```

Map GET `{ books }`, POST `{ book }`, and DELETE 204 through `apiRequest` without duplicating token logic.

- [ ] **Step 4: Implement focused presentational components**

`BookForm` owns controlled fields and a title `useRef<HTMLInputElement>`. It awaits `onCreate`; only after success does it clear all fields and call `titleRef.current?.focus()`. `BookList` uses semantic list/article markup and accessible delete labels such as `ลบ Dune`. `BookSearch` displays `พบ {resultCount} เล่ม`.

- [ ] **Step 5: Implement LibraryPage state and effects**

Include the reference marker in `LibraryPage.tsx`:

```tsx
// ref: 37aa88161f
const [books, setBooks] = useState<Book[]>([]);
```

On mount, fetch once, set loading false in `finally`, and avoid updating after unmount. Use `useMemo` with `[books, searchTerm]` to filter. Use an action state (`"created" | "deleted" | null`) and an update `useEffect` with `[books, action]` to translate the latest mutation into “เพิ่มหนังสือแล้ว” or “ลบหนังสือแล้ว”; guard the initial empty action so initial load does not create a success notice.

Create prepends the returned book. Delete disables only the active row, awaits API success, then filters by id. Network failures keep current data and set an actionable Thai error.

- [ ] **Step 6: Add logout and replace the temporary route content**

Render username and “ออกจากระบบ” in the library header. Logout clears auth and navigates to `/login` with replace. Update `App.tsx` to render `LibraryPage`.

- [ ] **Step 7: Run hook and behavior tests**

Run:

```powershell
npm test --workspace frontend -- LibraryPage.test.tsx
npm test --workspace frontend
npm run typecheck --workspace frontend
```

Expected: all frontend tests PASS; the focus assertion proves `useRef`; filtered result tests prove `useMemo`; mutation notice tests prove the update effect.

- [ ] **Step 8: Commit book management UI**

```powershell
git add frontend/src
git commit -m "feat: add searchable personal library interface"
```

---

### Task 7: Responsive visual system and accessibility pass

**Files:**
- Create: `frontend/src/styles/index.css`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/components/*.tsx`
- Modify: `frontend/src/pages/*.tsx`
- Create: `frontend/src/components/accessibility.test.tsx`

**Interfaces:**
- Consumes: stable component markup from Tasks 5–6
- Produces: CSS variables `--archive-blue`, `--midnight`, `--paper`, `--checkout-red`, `--ledger-green`, `--rule-blue`
- Produces: keyboard-visible focus, `aria-live` status, responsive layout at 360px+

- [ ] **Step 1: Write failing accessibility assertions**

Test that Login/Form/Search inputs have accessible labels, status message has `role="status"` and `aria-live="polite"`, errors have `role="alert"`, and every delete button has a book-specific accessible name.

Run: `npm test --workspace frontend -- accessibility.test.tsx`  
Expected: FAIL for any missing semantic attributes.

- [ ] **Step 2: Apply the approved design tokens**

Create CSS variables:

```css
:root {
  --archive-blue: #e7eef4;
  --midnight: #13233a;
  --paper: #f9fbfc;
  --checkout-red: #c3423f;
  --ledger-green: #28735a;
  --rule-blue: #afc2d2;
  color: var(--midnight);
  background: var(--archive-blue);
  font-family: Inter, "Segoe UI", sans-serif;
}
```

Use Georgia only for headings/book titles and `ui-monospace` for categories/counts. Implement the checkout-stamp result strip, disciplined 1px rules, 8px maximum radius, and one short success-notice transition.

- [ ] **Step 3: Add responsive and reduced-motion rules**

At desktop, use a narrow form rail and flexible catalogue area; below 760px stack them. Preserve 44px touch targets, no horizontal overflow at 360px, and add:

```css
:focus-visible { outline: 3px solid var(--checkout-red); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 4: Fix semantic failures and run the frontend gate**

Run:

```powershell
npm test --workspace frontend
npm run typecheck --workspace frontend
npm run build --workspace frontend
```

Expected: accessibility and behavior tests PASS; production build exits 0.

- [ ] **Step 5: Perform keyboard and viewport checks**

Run `npm run dev`, then verify at 360×800 and 1440×900:

- Tab order follows Login → Search → form → book actions → Logout.
- Focus is always visible.
- Loading, empty, error, success, long title, and long author states remain readable.
- Reduced-motion mode removes the notice transition.

Expected: no inaccessible control, overlap, clipping, or horizontal scroll.

- [ ] **Step 6: Commit presentation and accessibility**

```powershell
git add frontend/src
git commit -m "style: polish accessible library experience"
```

---

### Task 8: Bruno collection, documentation, reflection, and final verification

**Files:**
- Create: `api-collection/bruno.json`
- Create: `api-collection/environments/local.bru`
- Create: `api-collection/Auth/Login.bru`
- Create: `api-collection/Books/List.bru`
- Create: `api-collection/Books/Create.bru`
- Create: `api-collection/Books/Delete.bru`
- Create: `api-collection/Books/Create without token.bru`
- Create: `README.md`
- Create: `REFLECTION.md`
- Modify: `START-HERE.md`

**Interfaces:**
- Produces: Bruno variables `baseUrl`, `token`, `bookId`
- Produces: reproducible setup and reviewer credentials
- Consumes: final API contract and commands from Tasks 1–7

- [ ] **Step 1: Build the Bruno happy path**

Set `baseUrl` to `http://localhost:4000/api`. `Login.bru` sends reviewer credentials and stores `res.body.token` to collection variable `token`. `Create.bru` sends the three book fields, uses `Bearer {{token}}`, and stores `res.body.book.id` as `bookId`. List and Delete use the same token; Delete uses `/books/{{bookId}}`.

Each request includes a test block asserting its expected status and primary response shape. `Create without token.bru` omits Authorization and asserts status 401 plus exact error message.

- [ ] **Step 2: Run every Bruno request in order**

Run the collection in this order: Login → List → Create → Delete → Create without token.  
Expected statuses: `200, 200, 201, 204, 401` with no failed Bruno assertions.

- [ ] **Step 3: Write reproducible README**

Document, in order:

1. Node/npm prerequisites and repository structure.
2. `npm install`.
3. copying both `.env.example` files to `.env`.
4. each backend environment variable and why it exists.
5. `npm run prisma:migrate --workspace backend -- --name init` and `npm run prisma:seed --workspace backend`.
6. `npm run dev`, Backend/Frontend URLs, and server-ready log.
7. reviewer username `reviewer` and password `LibraryDemo123!` as local demo defaults.
8. test/typecheck/build commands.
9. Bruno collection order.
10. API table and authentication behavior.

State clearly that production users must replace demo credentials and JWT secret.

- [ ] **Step 4: Write the personal reflection**

Create `REFLECTION.md` in first-person language, no more than 10 non-empty lines. It must name the genuinely hardest part encountered during implementation and explain why; verify it matches actual experience instead of copying generic prose.

- [ ] **Step 5: Verify reference markers and prohibited files**

Run:

```powershell
rg -n "ref: 37aa88161f" backend/src frontend/src
git status --ignored --short
git diff --check
```

Expected: markers appear in principal backend API/auth and frontend library/auth files; `.env` and `*.db` are ignored; `git diff --check` prints nothing.

- [ ] **Step 6: Rebuild from documented clean-state instructions**

Use a fresh clone or temporary copy without `node_modules`, `.env`, and SQLite files, then execute README commands exactly.  
Expected: install, migration, seed, dev startup, reviewer login, and API calls all work without undocumented steps.

- [ ] **Step 7: Run final automated gates**

Run:

```powershell
npm test
npm run typecheck
npm run build
```

Expected: every command exits 0 with no skipped required test.

- [ ] **Step 8: Run the assignment acceptance checklist manually**

Verify in browser and Bruno:

- Initial unauthenticated visit redirects to Login.
- Successful Login stores token and opens the library.
- Books load with a visible loading state.
- Create updates immediately, clears all form inputs, and focuses title.
- Search filters by title, author, and category.
- Delete updates immediately.
- Removing localStorage token and attempting an action returns to Login.
- Expired/invalid/missing token receives 401.
- All UI states remain usable at mobile and desktop widths.

Expected: every item passes; capture any failure as a new failing automated test before fixing it.

- [ ] **Step 9: Update the handoff note and commit submission assets**

Update `START-HERE.md` latest handoff to state the real last test results and next action. Then run:

```powershell
git add README.md REFLECTION.md START-HERE.md api-collection backend/.env.example frontend/.env.example
git commit -m "docs: add reviewer setup and API collection"
git status --short --branch
git log --oneline --decorate -8
```

Expected: clean working tree and a truthful multi-commit history; do not squash before submission.

---

## Execution checkpoints

After Tasks 2, 4, 6, and 8, pause for a short review:

1. Compare completed behavior against the design spec and original assignment.
2. Run the full gate available at that point.
3. Inspect `git diff` or the completed commit for secrets, generated files, and unrelated changes.
4. Update `START-HERE.md` handoff note before ending the work session.

## Recovery rule

When a test or command fails, do not continue to the next checkbox. Record the exact command and first relevant error in `START-HERE.md`, reduce the problem to the smallest failing test, fix it, rerun the focused test, then rerun the current task's full gate.
