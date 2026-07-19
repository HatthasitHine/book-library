# ระบบจัดการคลังหนังสือส่วนตัว

ภาษาไทย | [English](README.md)

ระบบ Full-stack สำหรับจัดการคลังหนังสือส่วนตัว ใช้ React/Vite, Express, Prisma 7, SQLite และ JWT ที่มีอายุ 1 ชั่วโมง รองรับการเข้าสู่ระบบ ดูรายการ เพิ่ม ค้นหา และลบหนังสือ

## สิ่งที่ต้องมี

- Node.js 22.12+ LTS หรือ Node.js 24 และ npm 10 ขึ้นไป
- Bruno Desktop หรือ Bruno CLI สำหรับตรวจ API (ไม่บังคับ)
- `backend/` — Express, Prisma, SQLite, JWT และชุดทดสอบ
- `frontend/` — React, Vite, route guard, UI และชุดทดสอบ
- `api-collection/` — Bruno collection สำหรับทดสอบ API ตามลำดับ

## ติดตั้งและตั้งค่า

รันจากโฟลเดอร์รากของ repository:

```powershell
npm.cmd install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

บน macOS/Linux ใช้ `npm` แทน `npm.cmd` ส่วน Windows ใช้ `.cmd` เพื่อหลีกเลี่ยงกรณี PowerShell ปิดกั้น `npm.ps1`

ตัวแปรใน `backend/.env`:

| ตัวแปร | ความหมาย |
|---|---|
| `PORT` | พอร์ตของ Express ค่าเริ่มต้นคือ `4000` |
| `DATABASE_URL` | ตำแหน่ง SQLite ซึ่งอ้างอิงจาก `backend/` |
| `JWT_SECRET` | secret สำหรับเซ็น JWT ต้องยาวอย่างน้อย 32 ตัวอักษร |
| `CLIENT_ORIGIN` | origin ของ Frontend ที่ CORS อนุญาต |
| `SEED_USERNAME` | ชื่อผู้ใช้ที่คำสั่ง seed สร้างหรืออัปเดต |
| `SEED_PASSWORD` | รหัสผ่าน local ที่ seed นำไป hash ด้วย bcrypt cost 12 |

`frontend/.env` มี `VITE_API_URL` ซึ่งค่า local คือ `http://localhost:4000/api`

ค่าตัวอย่างมีไว้สำหรับตรวจงานในเครื่องเท่านั้น ก่อนใช้งานจริงต้องเปลี่ยน username, password และ JWT secret เก็บ `.env` ออกจาก Git และกำหนด CORS/database ให้ตรง environment จริง

## เตรียมฐานข้อมูลและข้อมูลทดลอง

```powershell
npm.cmd run prisma:setup --workspace backend
npm.cmd run prisma:seed --workspace backend
```

`prisma:setup` สร้างไฟล์ SQLite เฉพาะเมื่อยังไม่มี โดยไม่ล้างฐานข้อมูลเดิม แล้วใช้ `prisma db push` ให้ schema ตรงกับ `schema.prisma` ส่วน SQL baseline อยู่ที่ `backend/prisma/migrations/0_init/migration.sql` เพื่อใช้ตรวจประวัติ schema

## เปิดระบบ

```powershell
npm.cmd run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- ข้อความพร้อมใช้งาน: `Book library server is up and ready to roll on port 4000`

บัญชีทดลอง:

- Username: `reviewer`
- Password: `LibraryDemo123!`

## วิธีใช้งาน

1. เปิด Frontend แล้วเข้าสู่ระบบด้วยบัญชีทดลอง
2. กรอกชื่อหนังสือ ผู้เขียน และหมวดหมู่ แล้วกด **เพิ่มหนังสือ**
3. ใช้ช่องค้นหาเพื่อกรองจากชื่อหนังสือ ผู้เขียน หรือหมวดหมู่
4. กดปุ่ม **ลบ** บนหนังสือที่ต้องการนำออก
5. กด **ออกจากระบบ** เมื่อใช้งานเสร็จ

ข้อมูลหนังสือถูกบันทึกใน SQLite และทุก `/api/books` endpoint ต้องมี Bearer JWT

## ตรวจคุณภาพ

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run lint --workspace frontend
```

ผลตรวจล่าสุด: Backend 60 tests และ Frontend 37 tests ผ่าน รวมทั้ง lint, typecheck และ production build

## ทดสอบด้วย Bruno

เปิด `api-collection/bruno.json` เลือก environment `local` แล้วรันตามลำดับ:

1. `Auth/Login.bru`
2. `Books/List.bru`
3. `Books/Create.bru`
4. `Books/Delete.bru`
5. `Books/Create without token.bru`

หรือใช้ CLI:

```powershell
Push-Location api-collection
try {
  bru.cmd run Auth/Login.bru Books/List.bru Books/Create.bru Books/Delete.bru "Books/Create without token.bru" --env local --bail
} finally {
  Pop-Location
}
```

สถานะที่คาดหวังคือ `200, 200, 201, 204, 401`

## API

| Method | Path | การยืนยันตัวตน | ผลสำเร็จ | การทำงาน |
|---|---|---|---|---|
| `POST` | `/api/login` | ไม่ต้องใช้ | `200` | ตรวจ credentials แล้วคืน `{ token, user }` |
| `GET` | `/api/books` | Bearer JWT | `200` | คืนรายการหนังสือ เรียงใหม่ไปเก่า |
| `POST` | `/api/books` | Bearer JWT | `201` | เพิ่มหนังสือจาก `title`, `author`, `category` |
| `DELETE` | `/api/books/:id` | Bearer JWT | `204` | ลบหนังสือตาม numeric id |

หาก token ไม่มี รูปแบบผิด หมดอายุ หรือไม่ถูกต้อง API จะตอบ `401` และ Frontend จะล้าง session แล้วกลับหน้า Login

## การตรวจผ่าน Browser

ตรวจ flow หลักและ responsive layout แล้วที่ 360×800 และ 1440×900 รวมถึง loading, เพิ่ม/ล้างฟอร์ม/focus, ค้นหา, ลบ, logout, focus ที่มองเห็นได้, ข้อความยาว, touch target 44 px และการไม่ล้นแนวนอน ส่วนกรณี missing/invalid token ครอบคลุมด้วย automated tests, Bruno และ HTTP checks
