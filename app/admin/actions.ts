'use server';

import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { createSession, requireAdmin } from '@/lib/auth';
import { parseBaht } from '@/lib/money';
import { computePeriod, recomputeDraftPeriods } from '@/lib/payroll-service';
import { notify } from '@/lib/notifications';
import { DEFAULT_SETTINGS, saveSettings, type AppSettings } from '@/lib/settings';
import { fmtDate, fromLocalInput, isValidDateStr, isValidTime, monthRange, toDateStr } from '@/lib/time';

// ---------- helpers ----------
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const int = (fd: FormData, k: string) => {
  const n = parseInt(str(fd, k), 10);
  return Number.isFinite(n) ? n : null;
};
const num = (fd: FormData, k: string, def: number) => {
  const n = parseFloat(str(fd, k));
  return Number.isFinite(n) ? n : def;
};
function go(path: string, msg: { ok?: string; error?: string }): never {
  const q = new URLSearchParams(msg as Record<string, string>).toString();
  redirect(`${path}${path.includes('?') ? '&' : '?'}${q}`);
}
const isUnique = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

// ---------- พนักงาน ----------
export async function saveEmployeeAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const back = id ? `/admin/employees/${id}` : '/admin/employees/new';
  const code = str(fd, 'code');
  const name = str(fd, 'name');
  const password = str(fd, 'password');
  const payType = str(fd, 'payType');
  const role = str(fd, 'role') === 'ADMIN' ? 'ADMIN' : 'STAFF';
  const active = fd.get('active') === 'on';

  if (!code || !name) go(back, { error: 'กรุณากรอกรหัสและชื่อพนักงาน' });
  if (!id && password.length < 4) go(back, { error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
  if (!['MONTHLY', 'DAILY', 'HOURLY'].includes(payType)) go(back, { error: 'ประเภทค่าจ้างไม่ถูกต้อง' });
  const startDate = str(fd, 'startDate');
  if (startDate && !isValidDateStr(startDate)) go(back, { error: 'วันเริ่มงานไม่ถูกต้อง' });
  if (id === admin.id && (!active || role !== 'ADMIN')) go(back, { error: 'ไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีของตัวเองได้' });

  const data = {
    code,
    name,
    phone: optStr(fd, 'phone'),
    position: optStr(fd, 'position'),
    role,
    active,
    startDate: startDate || null,
    storeId: int(fd, 'storeId'),
    shiftId: int(fd, 'shiftId'),
    payType,
    baseSalary: parseBaht(fd.get('baseSalary')),
    allowance: parseBaht(fd.get('allowance')),
    socialSecurity: fd.get('socialSecurity') === 'on',
    taxDeduction: parseBaht(fd.get('taxDeduction')),
    bankName: optStr(fd, 'bankName'),
    bankAccount: optStr(fd, 'bankAccount'),
    taxId: optStr(fd, 'taxId'),
    ...(password
      ? { passwordHash: await bcrypt.hash(password, 10), passwordChangedAt: new Date(), mustChangePassword: id !== admin.id }
      : {}),
  };

  let savedId: number;
  try {
    if (id) {
      await prisma.employee.update({ where: { id }, data });
      savedId = id;
    } else {
      const e = await prisma.employee.create({ data: { ...data, passwordHash: data.passwordHash! } });
      savedId = e.id;
    }
  } catch (e) {
    if (isUnique(e)) go(back, { error: `รหัสพนักงาน "${code}" มีอยู่แล้ว` });
    throw e;
  }
  if (password && savedId === admin.id) await createSession(admin.id); // เปลี่ยนรหัสตัวเอง → ไม่ต้อง login ใหม่บนเครื่องนี้
  revalidatePath('/admin/employees');
  go(`/admin/employees/${savedId}`, {
    ok: password && savedId !== admin.id ? 'บันทึกแล้ว — พนักงานจะต้องตั้งรหัสผ่านใหม่เองเมื่อเข้าใช้ครั้งถัดไป' : 'บันทึกข้อมูลพนักงานแล้ว',
  });
}

// ---------- ร้าน ----------
export async function saveStoreAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, 'id');
  const name = str(fd, 'name');
  const latitude = num(fd, 'latitude', NaN);
  const longitude = num(fd, 'longitude', NaN);
  const radiusM = int(fd, 'radiusM') ?? 100;
  if (!name) go('/admin/stores', { error: 'กรุณากรอกชื่อร้าน' });
  if (!(latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180)) go('/admin/stores', { error: 'พิกัดไม่ถูกต้อง' });
  if (radiusM < 10 || radiusM > 5000) go('/admin/stores', { error: 'รัศมีต้องอยู่ระหว่าง 10–5000 เมตร' });
  const data = { name, address: optStr(fd, 'address'), latitude, longitude, radiusM };
  if (id) await prisma.store.update({ where: { id }, data });
  else await prisma.store.create({ data });
  go('/admin/stores', { ok: `บันทึกร้าน "${name}" แล้ว` });
}

// ---------- กะงาน / วันหยุด ----------
export async function saveShiftAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, 'id');
  const name = str(fd, 'name');
  const startTime = str(fd, 'startTime');
  const endTime = str(fd, 'endTime');
  const workDays = fd.getAll('workDays').map(String).filter((d) => /^[0-6]$/.test(d)).join(',');
  if (!name || !isValidTime(startTime) || !isValidTime(endTime)) go('/admin/shifts', { error: 'กรุณากรอกชื่อกะและเวลาให้ถูกต้อง' });
  const data = {
    name,
    startTime,
    endTime,
    breakMinutes: Math.max(0, int(fd, 'breakMinutes') ?? 60),
    lateGraceMinutes: Math.max(0, int(fd, 'lateGraceMinutes') ?? 0),
    workDays,
  };
  if (id) await prisma.shift.update({ where: { id }, data });
  else await prisma.shift.create({ data });
  go('/admin/shifts', { ok: `บันทึกกะ "${name}" แล้ว` });
}

export async function addHolidayAction(fd: FormData) {
  await requireAdmin();
  const date = str(fd, 'date');
  const name = str(fd, 'name');
  if (!isValidDateStr(date) || !name) go('/admin/shifts', { error: 'กรุณากรอกวันที่และชื่อวันหยุด' });
  await prisma.holiday.create({ data: { date, name, storeId: int(fd, 'storeId') } });
  go('/admin/shifts', { ok: 'เพิ่มวันหยุดแล้ว' });
}

export async function deleteHolidayAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, 'id');
  if (id) await prisma.holiday.delete({ where: { id } });
  go('/admin/shifts', { ok: 'ลบวันหยุดแล้ว' });
}

// ---------- การบันทึกเวลา (แก้ไขโดยผู้ดูแล — เก็บประวัติเสมอ) ----------
export async function addManualAttendanceAction(fd: FormData) {
  const admin = await requireAdmin();
  const back = `/admin/attendance?date=${str(fd, 'backDate')}`;
  const employeeId = int(fd, 'employeeId');
  const type = str(fd, 'type');
  const at = str(fd, 'timestamp');
  const note = str(fd, 'note');
  if (!employeeId || !['IN', 'OUT'].includes(type) || !at) go(back, { error: 'กรุณากรอกข้อมูลให้ครบ' });
  if (!note) go(back, { error: 'กรุณาระบุเหตุผลในการเพิ่มเวลา' });
  const timestamp = fromLocalInput(at);
  if (Number.isNaN(timestamp.getTime())) go(back, { error: 'วันเวลาไม่ถูกต้อง' });
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) go(back, { error: 'ไม่พบพนักงาน' });
  await prisma.attendance.create({
    data: { employeeId, storeId: emp.storeId, type, timestamp, source: 'MANUAL', note, createdById: admin.id },
  });
  await recomputeDraftPeriods(toDateStr(timestamp));
  go(back, { ok: 'เพิ่มรายการบันทึกเวลาแล้ว' });
}

export async function voidAttendanceAction(fd: FormData) {
  const admin = await requireAdmin();
  const back = `/admin/attendance?date=${str(fd, 'backDate')}`;
  const id = int(fd, 'id');
  const note = str(fd, 'voidNote');
  if (!id || !note) go(back, { error: 'กรุณาระบุเหตุผลในการยกเลิก' });
  const rec = await prisma.attendance.update({ where: { id }, data: { voidedAt: new Date(), voidedById: admin.id, voidNote: note } });
  await recomputeDraftPeriods(toDateStr(rec.timestamp));
  go(back, { ok: 'ยกเลิกรายการแล้ว (ยังเก็บประวัติไว้)' });
}

// ---------- ตั้งค่า ----------
export async function saveSettingsAction(fd: FormData) {
  await requireAdmin();
  const s = { ...DEFAULT_SETTINGS } as AppSettings;
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
    if (typeof DEFAULT_SETTINGS[k] === 'boolean') (s as unknown as Record<string, unknown>)[k] = fd.get(k) === 'on';
    else (s as unknown as Record<string, unknown>)[k] = Math.max(0, num(fd, k, DEFAULT_SETTINGS[k] as number));
  }
  if (s.hoursPerDay <= 0 || s.daysPerMonth <= 0) go('/admin/settings', { error: 'ชั่วโมงต่อวันและวันต่อเดือนต้องมากกว่า 0' });
  await saveSettings(s);
  go('/admin/settings', { ok: 'บันทึกการตั้งค่าแล้ว' });
}

// ---------- เงินเดือน ----------
async function getPeriod(fd: FormData) {
  const id = int(fd, 'periodId');
  const period = id ? await prisma.payrollPeriod.findUnique({ where: { id } }) : null;
  if (!period) go('/admin/payroll', { error: 'ไม่พบงวดเงินเดือน' });
  return period;
}

export async function createPeriodAction(fd: FormData) {
  await requireAdmin();
  let start = str(fd, 'startDate');
  let end = str(fd, 'endDate');
  const month = str(fd, 'month');
  if (month && /^\d{4}-\d{2}$/.test(month)) ({ start, end } = monthRange(month));
  if (!isValidDateStr(start) || !isValidDateStr(end) || end < start) go('/admin/payroll', { error: 'ช่วงวันที่ไม่ถูกต้อง' });
  const name = str(fd, 'name') || (month ? `เงินเดือน ${month}` : `งวด ${start} ถึง ${end}`);
  let id: number;
  try {
    id = (await prisma.payrollPeriod.create({ data: { name, startDate: start, endDate: end } })).id;
  } catch (e) {
    if (isUnique(e)) go('/admin/payroll', { error: 'มีงวดเงินเดือนช่วงวันที่นี้อยู่แล้ว' });
    throw e;
  }
  await computePeriod(id);
  const slips = await prisma.payslip.findMany({ where: { periodId: id }, select: { employeeId: true } });
  await notify(slips.map((s) => s.employeeId), {
    title: `กรุณายืนยันวันทำงาน: ${name}`,
    body: `ตรวจสอบและยืนยันได้ตั้งแต่ ${fmtDate(end)}`,
    link: `/confirm/${id}`,
  });
  go(`/admin/payroll/${id}`, { ok: 'สร้างงวดและคำนวณเงินเดือนแล้ว — แจ้งพนักงานให้ยืนยันวันทำงานแล้ว' });
}

export async function computePeriodAction(fd: FormData) {
  await requireAdmin();
  const p = await getPeriod(fd);
  if (p.status !== 'DRAFT') go(`/admin/payroll/${p.id}`, { error: 'งวดนี้อนุมัติแล้ว ต้องกลับเป็นร่างก่อนจึงจะคำนวณใหม่ได้' });
  await computePeriod(p.id);
  go(`/admin/payroll/${p.id}`, { ok: 'คำนวณใหม่เรียบร้อย' });
}

export async function updatePayslipAction(fd: FormData) {
  await requireAdmin();
  const p = await getPeriod(fd);
  if (p.status !== 'DRAFT') go(`/admin/payroll/${p.id}`, { error: 'งวดนี้อนุมัติแล้ว แก้ไขไม่ได้' });
  const slipId = int(fd, 'slipId');
  if (!slipId) go(`/admin/payroll/${p.id}`, { error: 'ไม่พบสลิป' });
  await prisma.payslip.update({
    where: { id: slipId, periodId: p.id },
    data: { bonus: parseBaht(fd.get('bonus')), otherDeduction: parseBaht(fd.get('otherDeduction')), note: optStr(fd, 'note') },
  });
  await computePeriod(p.id); // คำนวณใหม่เพื่อให้ประกันสังคม/ภาษี/ยอดสุทธิถูกต้อง
  go(`/admin/payroll/${p.id}`, { ok: 'บันทึกรายการปรับแล้ว' });
}

export async function setPeriodStatusAction(fd: FormData) {
  await requireAdmin();
  const p = await getPeriod(fd);
  const to = str(fd, 'to');
  const allowed: Record<string, string[]> = { DRAFT: ['APPROVED'], APPROVED: ['DRAFT', 'PAID'], PAID: [] };
  if (!allowed[p.status]?.includes(to)) go(`/admin/payroll/${p.id}`, { error: 'ไม่สามารถเปลี่ยนสถานะได้' });
  await prisma.payrollPeriod.update({
    where: { id: p.id },
    data: {
      status: to,
      ...(to === 'APPROVED' ? { approvedAt: new Date() } : {}),
      ...(to === 'PAID' ? { paidAt: new Date() } : {}),
      ...(to === 'DRAFT' ? { approvedAt: null } : {}),
    },
  });
  if (to === 'APPROVED') {
    const slips = await prisma.payslip.findMany({ where: { periodId: p.id }, select: { id: true, employeeId: true } });
    for (const s of slips) await notify([s.employeeId], { title: `สลิปเงินเดือน ${p.name} พร้อมแล้ว`, link: `/payslips/${s.id}` });
  }
  const label: Record<string, string> = { APPROVED: 'อนุมัติแล้ว พนักงานเห็นสลิปได้', PAID: 'บันทึกว่าจ่ายเงินแล้ว (ล็อกงวด)', DRAFT: 'กลับเป็นร่างแล้ว' };
  go(`/admin/payroll/${p.id}`, { ok: label[to] });
}

export async function deletePeriodAction(fd: FormData) {
  await requireAdmin();
  const p = await getPeriod(fd);
  if (p.status !== 'DRAFT') go(`/admin/payroll/${p.id}`, { error: 'ลบได้เฉพาะงวดที่เป็นร่าง' });
  await prisma.payrollPeriod.delete({ where: { id: p.id } });
  go('/admin/payroll', { ok: 'ลบงวดแล้ว' });
}

// ---------- ประกาศ ----------
export async function saveAnnouncementAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const back = id ? `/admin/announcements/${id}` : '/admin/announcements';
  const title = str(fd, 'title');
  const body = str(fd, 'body');
  const expiresAt = str(fd, 'expiresAt');
  if (!title || !body) go(back, { error: 'กรุณากรอกหัวข้อและรายละเอียด' });
  if (title.length > 120) go(back, { error: 'หัวข้อยาวเกิน 120 ตัวอักษร' });
  if (body.length > 5000) go(back, { error: 'รายละเอียดยาวเกิน 5,000 ตัวอักษร' });
  if (expiresAt && !isValidDateStr(expiresAt)) go(back, { error: 'วันหมดอายุไม่ถูกต้อง' });
  const data = {
    title,
    body,
    important: fd.get('important') === 'on',
    storeId: int(fd, 'storeId'),
    expiresAt: expiresAt || null,
  };
  if (id) {
    await prisma.announcement.update({ where: { id }, data });
    go(`/admin/announcements/${id}`, { ok: 'บันทึกการแก้ไขแล้ว' });
  }
  await prisma.announcement.create({ data: { ...data, createdById: admin.id } });
  go('/admin/announcements', { ok: 'ประกาศแล้ว พนักงานจะเห็นแจ้งเตือนเมื่อเปิดแอพ' });
}

export async function deleteAnnouncementAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, 'id');
  if (id) await prisma.announcement.delete({ where: { id } });
  go('/admin/announcements', { ok: 'ลบประกาศแล้ว' });
}

// ---------- วันลา ----------
export async function reviewLeaveAction(fd: FormData) {
  const admin = await requireAdmin();
  const back = str(fd, 'back') || '/admin/leave';
  const id = int(fd, 'id');
  const decision = str(fd, 'decision');
  const note = optStr(fd, 'note');
  const r = id ? await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: true } }) : null;
  if (!r) go(back, { error: 'ไม่พบคำขอลา' });
  const next = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : decision === 'CANCEL' ? 'CANCELLED' : null;
  const allowed = next && ((r.status === 'PENDING' && next !== 'CANCELLED') || (r.status === 'APPROVED' && next === 'CANCELLED'));
  if (!next || !allowed) go(back, { error: 'คำขอนี้ถูกดำเนินการไปแล้ว' });
  await prisma.leaveRequest.update({ where: { id: r.id }, data: { status: next, reviewedById: admin.id, reviewedAt: new Date(), reviewNote: note } });
  const range = r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`;
  const verb = next === 'APPROVED' ? 'อนุมัติ' : next === 'REJECTED' ? 'ไม่อนุมัติ' : 'ยกเลิก';
  await notify([r.employeeId], { title: `${verb}${r.leaveType.name}แล้ว`, body: `${range}${note ? ` — ${note}` : ''}`, link: '/leave' });
  if (r.status === 'APPROVED' || next === 'APPROVED') await recomputeDraftPeriods(r.startDate, r.endDate);
  go(back, { ok: `${verb}คำขอลาแล้ว` });
}

// แยก action ต่อปุ่ม เพื่อไม่ต้องพึ่งค่า name/value ของปุ่มที่กด
export async function approveLeaveAction(fd: FormData) {
  fd.set('decision', 'APPROVE');
  return reviewLeaveAction(fd);
}
export async function rejectLeaveAction(fd: FormData) {
  fd.set('decision', 'REJECT');
  return reviewLeaveAction(fd);
}

export async function saveLeaveTypeAction(fd: FormData) {
  await requireAdmin();
  const id = int(fd, 'id');
  const name = str(fd, 'name');
  const quotaRaw = str(fd, 'annualQuota');
  const color = /^#[0-9a-fA-F]{6}$/.test(str(fd, 'color')) ? str(fd, 'color') : '#3b82f6';
  if (!name) go('/admin/leave', { error: 'กรุณากรอกชื่อประเภทการลา' });
  const annualQuota = quotaRaw === '' ? null : Math.max(0, parseInt(quotaRaw, 10) || 0);
  const data = { name, paid: fd.get('paid') === 'on', annualQuota, color, active: fd.get('active') === 'on' };
  if (id) await prisma.leaveType.update({ where: { id }, data });
  else await prisma.leaveType.create({ data: { ...data, sortOrder: 99 } });
  go('/admin/leave#types', { ok: `บันทึกประเภท "${name}" แล้ว` });
}
