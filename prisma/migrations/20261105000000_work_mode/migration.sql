-- รูปแบบการทำงาน: CLOCK (บันทึกเวลา) | EXEMPT (ผู้บริหาร) | NONE (บัญชีระบบ)
ALTER TABLE "Employee" ADD COLUMN "workMode" TEXT NOT NULL DEFAULT 'CLOCK';

-- ค่าเริ่มต้นตามรหัสที่ร้านใช้: M… = ผู้บริหาร, บัญชีผู้ดูแลอื่น (เช่น admin) = บัญชีระบบ, ที่เหลือ = บันทึกเวลา
UPDATE "Employee" SET "workMode" = 'EXEMPT' WHERE "code" ILIKE 'M%';
UPDATE "Employee" SET "workMode" = 'NONE' WHERE "role" = 'ADMIN' AND "code" NOT ILIKE 'M%';
