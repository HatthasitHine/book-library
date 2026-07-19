# เริ่มงานที่นี่ — Personal Book Library

ไฟล์นี้คือ checklist สำหรับอ่านทุกครั้งก่อนเริ่มทำงาน เพื่อรักษาขอบเขต ลำดับ และคุณภาพของงาน

## เอกสารหลัก

1. อ่าน [Design specification](docs/superpowers/specs/2026-07-19-personal-book-library-design.md) เมื่อจำเป็นต้องทบทวนว่า "ระบบต้องทำงานอย่างไร"
2. ทำตาม [Implementation plan](docs/superpowers/plans/2026-07-19-personal-book-library.md) ทีละ task และทำเครื่องหมาย checkbox หลังตรวจสอบแล้วเท่านั้น
3. ยึดโจทย์ต้นฉบับเป็นข้อกำหนดสูงสุด หากเอกสารขัดกับโจทย์ให้หยุดและแก้เอกสารก่อนแก้โค้ด

## พิธีเริ่มงานทุกครั้ง

- [ ] รัน `git status --short --branch` และตรวจว่าอยู่ branch ที่ถูกต้อง
- [ ] เปิด implementation plan แล้วหาบรรทัดแรกที่ยังเป็น `- [ ]`
- [ ] อ่านทั้ง task ปัจจุบัน รวมถึง `Files`, `Interfaces` และผลลัพธ์ที่คาดหวัง
- [ ] ทำเพียงหนึ่ง red-green-refactor cycle ต่อครั้ง: test fail → implementation → test pass
- [ ] ห้ามข้าม test ที่ fail และห้ามรวมหลาย task ก่อน commit
- [ ] ไม่ใส่ secret จริงลง Git; ใช้ `.env` ในเครื่องและ commit เฉพาะ `.env.example`
- [ ] ตรวจว่าคอมเมนต์ `// ref: 37aa88161f` ยังอยู่ในไฟล์หลักตามโจทย์

## พิธีจบงานทุกครั้ง

- [ ] รัน test และ type-check ที่เกี่ยวข้องกับไฟล์ซึ่งแก้
- [ ] ตรวจ `git diff --check` และ `git diff --stat`
- [ ] อัปเดต checkbox ใน implementation plan เฉพาะขั้นที่ผ่านจริง
- [ ] commit งานที่ทดสอบผ่านด้วยข้อความตาม plan
- [ ] เขียนบันทึกสั้น ๆ ด้านล่าง: งานล่าสุด, ผลทดสอบ, ขั้นถัดไป และ blocker

## บันทึกส่งต่อรอบล่าสุด

- สถานะ: Task 8 implementation และ reproducible clean-checkout verification เสร็จแล้ว; รอ independent task review
- ขั้นถัดไป: independent review จาก agent ใหม่ แล้วจึงทำ final branch review/ส่งมอบ
- ผลทดสอบล่าสุด: backend 54 tests และ frontend 28 tests ผ่าน; root typecheck/build ผ่าน; Bruno 5/5 requests และ clean-copy gates ผ่าน
- Blocker: browser runtime รายงานว่าไม่พร้อมใช้งาน จึงยังไม่อ้างว่า visual/keyboard checklist ที่ mobile/desktop ผ่าน; ต้องตรวจด้วย browser จริงก่อน production/grading

## Definition of Done

### Task 2 SQLite setup

Prisma migration SQL is tracked at `backend/prisma/migrations/0_init/migration.sql`, generated from the schema with `prisma migrate diff`. For a clean checkout, copy `backend/.env.example` to `backend/.env`, then run `npm run prisma:setup --workspace backend` and `npm run prisma:seed --workspace backend`. The setup script creates the SQLite file without truncating an existing database and runs the local Prisma CLI with an absolute SQLite URL; `npm test --workspace backend` prepares an isolated test database the same way.

งานยังไม่เสร็จจนกว่าจะครบทุกข้อ:

- Backend เชื่อม SQLite จริงและ API contract ผ่าน automated tests
- ทุก `/api/books` endpoint ปฏิเสธ request ที่ไม่มี/หมดอายุ token ด้วย HTTP 401
- Frontend บังคับ Login, เก็บ JWT, แนบ Bearer token และ logout เมื่อพบ 401
- เพิ่ม ค้นหา และลบหนังสือได้; loading/error/empty/success states ทำงาน
- input ชื่อหนังสือถูกล้างและ focus หลังเพิ่มสำเร็จ
- Bruno collection ครบ Login, GET, POST, DELETE และกรณี 401
- `README.md`, `.env.example`, Prisma migration/seed และ `REFLECTION.md` พร้อมตรวจ
- มี commit history ตามลำดับจริงและไม่มี secret หรือ database file ถูก commit
