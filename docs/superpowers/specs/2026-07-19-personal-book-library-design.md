# Personal Book Library Design Specification

**Date:** 2026-07-19
**Status:** Approved
**Reference marker:** `// ref: 37aa88161f`

## 1. Goal and scope

สร้างเว็บแอปคลังหนังสือส่วนตัวที่ผู้ตรวจสามารถติดตั้งและรันในเครื่องเดียวได้ภายในขั้นตอนสั้น ๆ ผู้ใช้ต้อง Login ก่อนเข้าคลัง จากนั้นดู เพิ่ม ค้นหา และลบหนังสือได้ ระบบต้องแสดง loading/error/success อย่างชัดเจน เก็บข้อมูลในฐานข้อมูลจริง และมี Bruno collection สำหรับตรวจ API

ขอบเขตนี้ไม่รวม registration, refresh token, role/permission, edit book, pagination, cloud deployment และ third-party authentication เพื่อรักษา YAGNI และกรอบเวลา 7 วัน

## 2. Chosen architecture

ใช้ npm workspaces แบบ monorepo แยก `frontend/` และ `backend/` แต่รันคำสั่งหลักจาก repository root ได้ Frontend เป็น React + Vite + TypeScript; Backend เป็น Node.js + Express + TypeScript; Prisma เชื่อม SQLite เพื่อให้เป็นฐานข้อมูลจริงโดยไม่บังคับผู้ตรวจติดตั้ง database server เพิ่ม

```text
Browser
  └─ React Router + Auth state
       └─ typed fetch client (Bearer JWT, centralized 401 handling)
            └─ Express routes
                 ├─ auth service ── bcrypt + jsonwebtoken
                 └─ book service ── Prisma ── SQLite
```

## 3. Repository structure

```text
.
├─ START-HERE.md
├─ package.json
├─ .gitignore
├─ README.md
├─ REFLECTION.md
├─ backend/
│  ├─ prisma/schema.prisma
│  ├─ prisma/seed.ts
│  ├─ src/app.ts
│  ├─ src/server.ts
│  ├─ src/config/env.ts
│  ├─ src/db/prisma.ts
│  ├─ src/auth/{password,token}.ts
│  ├─ src/middleware/{authenticate,error-handler}.ts
│  ├─ src/modules/auth/{auth.routes,auth.schema,auth.service}.ts
│  ├─ src/modules/books/{book.routes,book.schema,book.service}.ts
│  └─ tests/
├─ frontend/
│  ├─ src/api/{client,books,auth}.ts
│  ├─ src/auth/{AuthProvider,ProtectedRoute}.tsx
│  ├─ src/components/{BookForm,BookList,BookSearch,StatusMessage}.tsx
│  ├─ src/pages/{LoginPage,LibraryPage}.tsx
│  ├─ src/styles/index.css
│  └─ src/test/
└─ api-collection/
   ├─ bruno.json
   ├─ environments/local.bru
   ├─ Auth/Login.bru
   └─ Books/{List,Create,Delete,Create without token}.bru
```

ทุกไฟล์มีความรับผิดชอบเดียว Route ทำเฉพาะ HTTP mapping, service ทำ business/data access, schema ทำ validation และ frontend API client ทำ network/auth behavior ร่วมกัน

## 4. Domain model

### User

- `id: number` — primary key
- `username: string` — unique
- `passwordHash: string` — bcrypt hash เท่านั้น
- `createdAt: Date`

ผู้ใช้ทดสอบถูกสร้างด้วย seed โดยอ่าน `SEED_USERNAME` และ `SEED_PASSWORD` จาก environment ไม่เก็บ plaintext password ในฐานข้อมูล

### Book

- `id: number` — primary key
- `title: string` — required, trimmed, 1–160 characters
- `author: string` — required, trimmed, 1–120 characters
- `category: string` — required, trimmed, 1–80 characters
- `createdAt: Date`

ไม่มี owner relation เพราะโจทย์ต้องการ credential สำหรับผู้ตรวจเพียงชุดเดียวและไม่ได้กำหนด multi-user isolation

## 5. API contract

ทุก response ที่มี body ใช้ JSON และ error ใช้รูป `{ "error": string, "details"?: object }`

### `POST /api/login`

Request: `{ "username": string, "password": string }`
Success `200`: `{ "token": string, "user": { "username": string } }`
Invalid credentials `401`: `{ "error": "Invalid username or password" }`
Invalid input `400`: validation error

JWT ใช้ HS256, payload `{ sub: userId, username }`, อายุ `1h`, secret อย่างน้อย 32 ตัวอักษรจาก `JWT_SECRET`

### Protected book endpoints

ทุก endpoint ต่อไปนี้ต้องมี `Authorization: Bearer <token>` รวมทั้ง GET ซึ่งเข้มกว่าขั้นต่ำของโจทย์แต่สอดคล้องกับ Auth Guard และป้องกันการอ่านข้อมูลโดยตรง

- `GET /api/books` → `200 { "books": Book[] }`, เรียง `createdAt` ใหม่ไปเก่า
- `POST /api/books` + valid book body → `201 { "book": Book }`
- `DELETE /api/books/:id` → `204` ไม่มี body
- DELETE id ที่ไม่มีอยู่ → `404 { "error": "Book not found" }`
- token หาย malformed invalid หรือ expired → `401 { "error": "Access denied: session credential missing or expired" }`

## 6. Frontend behavior and data flow

Routing มี `/login` และ `/books`; path อื่น redirect ตามสถานะ auth `AuthProvider` อ่าน token จาก `localStorage` key `book-library-token` และ username จาก `book-library-username` ตอน mount แล้ว expose `login(token, user)`, `logout()` และ `token` การเก็บ username มีไว้แสดงผลเท่านั้น ไม่ใช้ตัดสิน authorization

`ProtectedRoute` ไม่ render `LibraryPage` เมื่อไม่มี token แต่ redirect ไป `/login` พร้อมข้อความ “กรุณาเข้าสู่ระบบก่อนใช้งาน” `apiClient` แนบ Bearer token ทุก request และเรียก centralized unauthorized handler เมื่อพบ 401 เพื่อ clear token และกลับ Login

`LibraryPage` ถือ state หลัก ได้แก่ `books`, `searchTerm`, `loading`, `error`, `notice` และ form values ถูกควบคุมใน `BookForm` ลำดับสำคัญ:

1. Mount → GET books → render list หรือ empty state
2. Submit → POST → prepend book ใน state → clear inputs → focus ช่อง title ผ่าน `useRef` → `useEffect` ที่ติดตาม book/action state แสดง notice
3. Delete → DELETE → remove book จาก state → `useEffect` ที่ติดตาม book/action state แสดง notice
4. Search → `useMemo` กรอง title/author/category แบบ case-insensitive
5. Book state เปลี่ยนหลัง mutation → `useEffect` ประกาศ notice ที่มาจาก action ล่าสุด; initial fetch ไม่สร้าง success notice

## 7. Visual and interaction direction

หน้าจอเป็น “โต๊ะบัตรรายการห้องสมุดร่วมสมัย” ใช้พื้น `Archive Blue #E7EEF4`, หมึก `Midnight #13233A`, panel `Paper White #F9FBFC`, accent `Checkout Red #C3423F`, success `Ledger Green #28735A` และเส้น `Rule Blue #AFC2D2` หลีกเลี่ยง dashboard card สำเร็จรูป

Typography ใช้ system-safe stack เพื่อไม่พึ่ง network: Georgia สำหรับชื่อหน้า/ชื่อหนังสือ, `Inter, Segoe UI, sans-serif` สำหรับ body และ `ui-monospace` สำหรับ category/count ลายเซ็นของหน้าเป็นแถบ “checkout stamp” ที่บอกจำนวนผลลัพธ์และคำค้นหา ปุ่มและข้อความใช้คำตรงกัน เช่น “เพิ่มหนังสือ” → “เพิ่มหนังสือแล้ว”

รองรับ mobile 360px, desktop, keyboard navigation, visible focus, semantic labels, `aria-live` สำหรับ status และ `prefers-reduced-motion`

## 8. Validation and error handling

Zod validate environment ตอน process start และ validate request body/params ก่อน service Frontend validate required fields เพื่อ feedback ทันที แต่ Backend เป็น source of truth เสมอ Error handler ไม่ส่ง stack trace ใน response

CORS ยอมเฉพาะ `CLIENT_ORIGIN`; JSON limit ใช้ค่าต่ำเหมาะกับ payload หนังสือ Login ให้ข้อความเดียวกันทั้ง username ไม่มีจริงและ password ผิด เพื่อลด account enumeration ไม่มี secret อยู่ใน source, Bruno file หรือ Git history

## 9. Testing strategy

- Backend unit/integration: Vitest + Supertest กับ test database แยก ทดสอบ login, token errors, validation, GET/POST/DELETE และ 404
- Frontend component/integration: Vitest + React Testing Library + MSW ทดสอบ redirect, login storage, initial loading, mutations, search/useMemo, focus/useRef และ 401 logout
- Contract/manual: Bruno collection ครบ happy paths และ unauthorized request
- Final quality gates: `npm test`, `npm run typecheck`, `npm run build`, Prisma migration from clean database และตรวจ checklist ในโจทย์ด้วย browser

## 10. Delivery and documentation

`README.md` ต้องมี prerequisites, install, environment variables, migration/seed, run commands, test commands, URLs และ test username/password `REFLECTION.md` ต้องใช้ภาษาของเจ้าของงานและไม่เกิน 10 บรรทัด `.env.example` ใส่ค่า local demo ที่ไม่ใช่ production secret ส่วน `.env`, `*.db`, coverage และ build output ถูก ignore

Commit แยกตาม task จริง ห้าม squash ก่อนส่ง งานพร้อมส่งเมื่อ Definition of Done ใน `START-HERE.md` และทุก checkbox ใน implementation plan ผ่านเท่านั้น

## 11. Decisions and non-decisions

- เลือก React + Vite แทน Next.js เพราะ backend แยกอยู่แล้วและโจทย์เน้น hooks/client API
- เลือก SQLite + Prisma แทน external database เพื่อให้ตรวจได้เร็วและยังเป็น persistent database จริง
- ป้องกัน GET books ด้วย JWT เพื่อให้ API และ Auth Guard มี security boundary เดียวกัน
- ค้นหาฝั่ง client เพราะ dataset ส่วนตัวมีขนาดเล็กและโจทย์ไม่ได้ขอ search endpoint
- ไม่ใช้ refresh token; เมื่อ token หมดอายุผู้ใช้ Login ใหม่ตามโจทย์
