/**
 * ข้อมูลเริ่มต้น — รันซ้ำได้ ไม่ลบหรือเขียนทับข้อมูลเดิม
 *
 *   tsx prisma/seed.ts          ใช้จริง (server): สร้างเฉพาะบัญชีผู้ดูแล + ค่าเริ่มต้น
 *   tsx prisma/seed.ts --demo   ทดลองในเครื่อง: เพิ่มร้าน/พนักงาน/วันหยุดตัวอย่าง
 *
 * บัญชีผู้ดูแลแรก (โหมดใช้จริง): รหัส "admin" รหัสผ่านจากตัวแปร ADMIN_INITIAL_PASSWORD
 * ถ้าไม่ได้ตั้ง ระบบจะสุ่มให้และพิมพ์ไว้ใน log — ต้องเปลี่ยนรหัสตอนเข้าใช้ครั้งแรก
 */
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const demo = process.argv.includes('--demo');

async function defaults() {
  if ((await prisma.shift.count()) === 0) {
    await prisma.shift.create({
      data: { name: 'กะเช้า', startTime: '09:00', endTime: '18:00', breakMinutes: 60, lateGraceMinutes: 5, workDays: '1,2,3,4,5,6' },
    });
  }

  // ประเภทการลาเริ่มต้น (อ้างอิงกฎหมายแรงงานไทย — แก้ได้ที่หน้า "วันลา")
  if ((await prisma.leaveType.count()) === 0) {
    await prisma.leaveType.createMany({
      data: [
        { name: 'ลาป่วย', paid: true, annualQuota: 30, color: '#8b5cf6', sortOrder: 1, sick: true },
        { name: 'ลากิจ', paid: true, annualQuota: 3, color: '#c9962f', sortOrder: 2 },
        { name: 'ลาพักร้อน', paid: true, annualQuota: 6, color: '#3b82f6', sortOrder: 3 },
        { name: 'ลาไม่รับเงิน', paid: false, annualQuota: null, color: '#8b8378', sortOrder: 4 },
      ],
    });
  }
  // ฐานข้อมูลเดิม: ตั้งให้ “ลาป่วย” เป็นประเภทลาป่วย (ใช้กับ achievement ขยันเต็มเดือน)
  if ((await prisma.leaveType.count({ where: { sick: true } })) === 0) {
    await prisma.leaveType.updateMany({ where: { name: 'ลาป่วย' }, data: { sick: true } });
  }
}

async function productionAdmin() {
  if ((await prisma.employee.count({ where: { role: 'ADMIN' } })) > 0) return;
  const fromEnv = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  const password = fromEnv && fromEnv.length >= 8 ? fromEnv : randomBytes(6).toString('base64url');
  const shift = await prisma.shift.findFirst();
  await prisma.employee.create({
    data: {
      code: 'admin',
      name: 'ผู้ดูแลระบบ',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, 10),
      mustChangePassword: true,
      payType: 'MONTHLY',
      baseSalary: 0,
      socialSecurity: false,
      shiftId: shift?.id ?? null,
      startDate: new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10),
    },
  });
  console.log('========================================================');
  console.log(' สร้างบัญชีผู้ดูแลระบบแล้ว');
  console.log('   รหัสพนักงาน: admin');
  console.log(fromEnv && fromEnv.length >= 8 ? '   รหัสผ่าน: ตามที่ตั้งไว้ใน ADMIN_INITIAL_PASSWORD' : `   รหัสผ่านชั่วคราว: ${password}`);
  console.log(' ระบบจะให้ตั้งรหัสผ่านใหม่เมื่อเข้าใช้ครั้งแรก');
  console.log('========================================================');
}

async function demoData() {
  const store =
    (await prisma.store.findFirst()) ??
    (await prisma.store.create({
      data: { name: 'ร้านตัวอย่าง สาขาสยาม', address: 'ปทุมวัน กรุงเทพฯ', latitude: 13.7456, longitude: 100.5347, radiusM: 100 },
    }));
  const shift = await prisma.shift.findFirst();
  const users = [
    { code: 'admin', name: 'ผู้ดูแลระบบ', role: 'ADMIN', password: 'admin1234', payType: 'MONTHLY', baseSalary: 0, socialSecurity: false },
    { code: 'E001', name: 'สมชาย ใจดี', role: 'STAFF', password: '1234', position: 'พนักงานขาย', payType: 'MONTHLY', baseSalary: 1_500_000, socialSecurity: true },
    { code: 'E002', name: 'สมหญิง ขยันงาน', role: 'STAFF', password: '1234', position: 'พนักงานพาร์ทไทม์', payType: 'DAILY', baseSalary: 40_000, socialSecurity: false },
  ];
  const startDate = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  for (const { password, ...u } of users) {
    await prisma.employee.upsert({
      where: { code: u.code },
      update: {},
      create: { ...u, startDate, passwordHash: await bcrypt.hash(password, 10), storeId: store.id, shiftId: shift?.id ?? null },
    });
  }
  const holidays = [
    { date: '2026-12-05', name: 'วันพ่อแห่งชาติ' },
    { date: '2026-12-10', name: 'วันรัฐธรรมนูญ' },
    { date: '2026-12-31', name: 'วันสิ้นปี' },
    { date: '2027-01-01', name: 'วันขึ้นปีใหม่' },
  ];
  for (const h of holidays) {
    if (!(await prisma.holiday.findFirst({ where: { date: h.date } }))) await prisma.holiday.create({ data: h });
  }
  console.log('ข้อมูลทดลองเรียบร้อย — admin / admin1234, E001 / 1234, E002 / 1234');
}

async function main() {
  await defaults();
  if (demo) await demoData();
  else await productionAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
