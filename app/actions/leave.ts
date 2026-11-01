'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { toShiftDef } from '@/lib/attendance';
import { MAX_LEAVE_RANGE_DAYS, workingDates } from '@/lib/leave';
import { notifyAdmins } from '@/lib/notifications';
import { employedFrom, holidaySetFor, loadHolidays, recomputeDraftPeriods } from '@/lib/payroll-service';
import { daysInclusive, fmtDate, isValidDateStr, toDateStr } from '@/lib/time';

export interface LeaveResult {
  ok?: boolean;
  error?: string;
  message?: string;
}

const dateRange = (s: string, e: string) => (s === e ? fmtDate(s) : `${fmtDate(s)} – ${fmtDate(e)}`);

export async function requestLeaveAction(_prev: LeaveResult | undefined, fd: FormData): Promise<LeaveResult> {
  const user = await getCurrentUser();
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' };
  if (user.mustChangePassword) return { error: 'กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน' };
  const leaveTypeId = Number(fd.get('leaveTypeId'));
  const startDate = String(fd.get('startDate') ?? '');
  const endDate = String(fd.get('endDate') || startDate);
  const reason = String(fd.get('reason') ?? '').trim().slice(0, 500) || null;

  const type = Number.isInteger(leaveTypeId) ? await prisma.leaveType.findFirst({ where: { id: leaveTypeId, active: true } }) : null;
  if (!type) return { error: 'กรุณาเลือกประเภทการลา' };
  if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) return { error: 'กรุณาเลือกวันที่' };
  if (endDate < startDate) return { error: 'วันสิ้นสุดต้องไม่ก่อนวันเริ่ม' };
  if (daysInclusive(startDate, endDate) > MAX_LEAVE_RANGE_DAYS) return { error: `ขอลาได้ครั้งละไม่เกิน ${MAX_LEAVE_RANGE_DAYS} วัน` };
  if (startDate < employedFrom(user)) return { error: 'ไม่สามารถลาก่อนวันเริ่มงานได้' };

  const shift = user.shiftId ? await prisma.shift.findUnique({ where: { id: user.shiftId } }) : null;
  const holidays = holidaySetFor(await loadHolidays(startDate, endDate), user.storeId);
  const days = workingDates(startDate, endDate, toShiftDef(shift), holidays).length;
  if (days === 0) return { error: 'ช่วงที่เลือกเป็นวันหยุดทั้งหมด ไม่ต้องขอลา' };

  const overlap = await prisma.leaveRequest.findFirst({
    where: { employeeId: user.id, status: { in: ['PENDING', 'APPROVED'] }, startDate: { lte: endDate }, endDate: { gte: startDate } },
  });
  if (overlap) return { error: `มีคำขอลาช่วง ${dateRange(overlap.startDate, overlap.endDate)} อยู่แล้ว` };

  await prisma.leaveRequest.create({ data: { employeeId: user.id, leaveTypeId: type.id, startDate, endDate, days, reason } });
  await notifyAdmins({ title: `คำขอลาใหม่: ${user.name}`, body: `${type.name} · ${dateRange(startDate, endDate)} (${days} วัน)`, link: '/admin/leave' });
  revalidatePath('/leave');
  return { ok: true, message: `ส่งคำขอ${type.name} ${days} วันแล้ว รอผู้ดูแลอนุมัติ` };
}

/** ยกเลิกคำขอ: ที่ยังรออนุมัติ หรือที่อนุมัติแล้วแต่ยังไม่ถึงวันลา */
export async function cancelLeaveAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = Number(fd.get('id'));
  const r = Number.isInteger(id) ? await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: true } }) : null;
  if (!r || r.employeeId !== user.id) return;
  const today = toDateStr(new Date());
  const allowed = r.status === 'PENDING' || (r.status === 'APPROVED' && r.startDate > today);
  if (!allowed) return;
  await prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  if (r.status === 'APPROVED') {
    await notifyAdmins({ title: `${user.name} ยกเลิกการลา`, body: `${r.leaveType.name} · ${dateRange(r.startDate, r.endDate)}`, link: '/admin/leave' });
    await recomputeDraftPeriods(r.startDate, r.endDate);
  }
  revalidatePath('/leave');
}
