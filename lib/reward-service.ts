import 'server-only';
import { prisma } from './db';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_KEY } from './achievement-defs';
import { evaluateMonth } from './achievements';
import { summarizeDays, toShiftDef } from './attendance';
import { visibleTo } from './announcements';
import { notify } from './notifications';
import { employedFrom, holidaySetFor, leavesFor, loadHolidays, loadLeaveContext, loadPunches } from './payroll-service';
import { getSettings } from './settings';
import { addDays, atTime, monthRange, toDateStr } from './time';

/** เงินรางวัล (สตางค์) และเปิด/ปิด ของแต่ละ achievement */
export async function achievementSettings() {
  const rows = await prisma.achievementSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r]));
  return new Map(
    ACHIEVEMENTS.map((a) => {
      const r = map.get(a.key);
      return [a.key, { amount: r ? r.rewardAmount : a.defaultAmount * 100, active: r ? r.active : true }] as const;
    }),
  );
}

/** ยอดเงินคงเหลือในกระปุก = ได้รับ (ไม่ถูกเพิกถอน) − แลกแล้ว/รอแลก */
export async function walletOf(employeeId: number) {
  const [earned, spent, pending] = await Promise.all([
    prisma.employeeAchievement.aggregate({ where: { employeeId, revokedAt: null }, _sum: { amount: true } }),
    prisma.rewardRedemption.aggregate({ where: { employeeId, status: { in: ['APPROVED', 'PAID'] } }, _sum: { amount: true } }),
    prisma.rewardRedemption.aggregate({ where: { employeeId, status: 'PENDING' }, _sum: { amount: true } }),
  ]);
  const e = earned._sum.amount ?? 0;
  const s = spent._sum.amount ?? 0;
  const p = pending._sum.amount ?? 0;
  return { earned: e, redeemed: s, pending: p, balance: e - s - p };
}

/** ให้ badge (ถ้ายังไม่เคยได้ในรอบนั้น) — คืน true ถ้าเพิ่งได้ */
export async function grant(employeeId: number, key: string, periodKey: string, opts: { amount?: number; note?: string | null; byId?: number | null } = {}) {
  const def = ACHIEVEMENT_BY_KEY.get(key);
  if (!def) return false;
  const settings = await achievementSettings();
  const conf = settings.get(key)!;
  if (!conf.active && def.kind === 'AUTO') return false;
  const exists = await prisma.employeeAchievement.findUnique({ where: { employeeId_achievementKey_periodKey: { employeeId, achievementKey: key, periodKey } } });
  if (exists) return false;
  const amount = opts.amount ?? conf.amount;
  await prisma.employeeAchievement.create({
    data: { employeeId, achievementKey: key, periodKey, amount, note: opts.note ?? null, awardedById: opts.byId ?? null },
  });
  await notify([employeeId], {
    title: `🎉 ได้รับ badge “${def.name}”`,
    body: amount > 0 ? `+${(amount / 100).toLocaleString('th-TH')} บาท เข้ากระปุก KICHI — แตะเพื่อรับ` : 'แตะเพื่อรับ badge',
    link: '/rewards',
  });
  return true;
}

/**
 * ประเมิน achievement อัตโนมัติของเดือนที่จบแล้ว (ทำซ้ำได้ ไม่ให้ซ้ำ)
 * เรียกตอนอนุมัติงวดเงินเดือน เพราะข้อมูลผ่านการยืนยันแล้ว
 */
export async function evaluateMonthForAll(month: string) {
  const { start, end } = monthRange(month);
  const settings = await getSettings();
  const employees = (await prisma.employee.findMany({ where: { active: true }, include: { shift: true } })).filter(
    (e) => employedFrom(e) <= end && (e.role === 'STAFF' || e.baseSalary > 0),
  );
  let granted = 0;
  for (const emp of employees) {
    const from = employedFrom(emp);
    // streak ยาวสุด 250 วันทำงาน ≈ 300 วันปฏิทิน — ย้อนดู 420 วันพอ
    const histStart = from > addDays(end, -420) ? from : addDays(end, -420);
    const [punches, holidays, leaveCtx, perfect, anns] = await Promise.all([
      loadPunches([emp.id], histStart, end),
      loadHolidays(histStart, end),
      loadLeaveContext([emp.id], histStart, end),
      prisma.employeeAchievement.findMany({ where: { employeeId: emp.id, achievementKey: 'perfect_month', revokedAt: null }, select: { periodKey: true } }),
      prisma.announcement.findMany({
        where: { ...visibleTo(emp, end), createdAt: { gte: atTime(start, '00:00'), lt: atTime(addDays(end, 1), '00:00') } },
        include: { reads: { where: { employeeId: emp.id } } },
      }),
    ]);
    const shift = toShiftDef(emp.shift);
    const historyDays = summarizeDays({
      punches,
      shift,
      holidays: holidaySetFor(holidays, emp.storeId),
      startDate: histStart,
      endDate: end,
      today: toDateStr(new Date()),
      otBlockMinutes: settings.otBlockMinutes,
      employedFrom: from,
      leaves: leavesFor(leaveCtx, emp),
    });
    const awards = evaluateMonth({
      month,
      monthDays: historyDays.filter((d) => d.date >= start),
      historyDays,
      employedFrom: from,
      shift,
      sickGraceDays: settings.sickGraceDays,
      perfectMonths: new Set(perfect.map((p) => p.periodKey)),
      announcements: anns.map((a) => ({ createdAt: a.createdAt, readAt: a.reads[0]?.readAt ?? null })),
    });
    for (const a of awards) if (await grant(emp.id, a.key, a.periodKey)) granted++;
  }
  return granted;
}

/** “ยืนยันไว” — ยืนยันวันทำงานภายในวันแรกที่เปิดให้ยืนยัน */
export async function grantQuickConfirm(periodId: number) {
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId }, include: { confirmations: true } });
  if (!period) return;
  for (const c of period.confirmations) {
    if (c.status === 'CONFIRMED' && toDateStr(c.respondedAt) <= period.endDate) await grant(c.employeeId, 'quick_confirm', `period-${periodId}`);
  }
}
