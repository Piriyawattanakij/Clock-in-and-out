'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canConfirm, slipSnapshot } from '@/lib/confirmation';
import { notifyAdmins } from '@/lib/notifications';
import { toDateStr } from '@/lib/time';

export async function confirmPeriodAction(_prev: { ok?: boolean; error?: string } | undefined, fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' };
  const periodId = Number(fd.get('periodId'));
  const decision = String(fd.get('decision'));
  const note = String(fd.get('note') ?? '').trim().slice(0, 1000) || null;
  const period = Number.isInteger(periodId) ? await prisma.payrollPeriod.findUnique({ where: { id: periodId } }) : null;
  if (!period) return { error: 'ไม่พบงวดเงินเดือน' };
  if (!canConfirm(period, toDateStr(new Date()))) return { error: period.status === 'DRAFT' ? 'ยังไม่ถึงวันยืนยัน' : 'งวดนี้อนุมัติแล้ว' };
  const slip = await prisma.payslip.findUnique({ where: { periodId_employeeId: { periodId, employeeId: user.id } } });
  if (!slip) return { error: 'ไม่พบข้อมูลของคุณในงวดนี้' };
  if (decision !== 'CONFIRMED' && decision !== 'DISPUTED') return { error: 'ข้อมูลไม่ถูกต้อง' };
  if (decision === 'DISPUTED' && !note) return { error: 'กรุณาระบุว่าวันไหนไม่ถูกต้อง' };

  const data = { status: decision, note: decision === 'DISPUTED' ? note : null, snapshot: slipSnapshot(slip), respondedAt: new Date() };
  await prisma.periodConfirmation.upsert({
    where: { periodId_employeeId: { periodId, employeeId: user.id } },
    update: data,
    create: { ...data, periodId, employeeId: user.id },
  });
  if (decision === 'DISPUTED') {
    await notifyAdmins({ title: `${user.name} แจ้งแก้ไขวันทำงาน`, body: `${period.name}: ${note}`, link: `/admin/payroll/${periodId}` });
  }
  revalidatePath(`/confirm/${periodId}`);
  return { ok: true };
}
