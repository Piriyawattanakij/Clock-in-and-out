'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { fmtBaht, parseBaht } from '@/lib/money';
import { notifyAdmins } from '@/lib/notifications';
import { walletOf } from '@/lib/reward-service';
import { getSettings } from '@/lib/settings';

/** กดรับ badge (เปิดดู effect) */
export async function claimAchievementAction(id: number) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.employeeAchievement.updateMany({ where: { id, employeeId: user.id, claimedAt: null }, data: { claimedAt: new Date() } });
  revalidatePath('/rewards');
  revalidatePath('/clock');
}

export async function requestRedemptionAction(_prev: { ok?: boolean; error?: string } | undefined, fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' };
  const amount = parseBaht(fd.get('amount'));
  const [w, settings, pending] = await Promise.all([
    walletOf(user.id),
    getSettings(),
    prisma.rewardRedemption.count({ where: { employeeId: user.id, status: 'PENDING' } }),
  ]);
  const min = settings.rewardMinRedeem * 100;
  if (pending > 0) return { error: 'มีคำขอแลกที่รออนุมัติอยู่แล้ว' };
  if (amount < min) return { error: `แลกได้ขั้นต่ำ ${fmtBaht(min)} บาท` };
  if (amount > w.balance) return { error: `ยอดในกระปุกมี ${fmtBaht(w.balance)} บาท` };
  await prisma.rewardRedemption.create({ data: { employeeId: user.id, amount } });
  await notifyAdmins({ title: `${user.name} ขอแลกเงินรางวัล ฿${fmtBaht(amount)}`, link: '/admin/rewards' });
  revalidatePath('/rewards');
  return { ok: true };
}

export async function cancelRedemptionAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.rewardRedemption.updateMany({ where: { id: Number(fd.get('id')), employeeId: user.id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
  revalidatePath('/rewards');
}
