import 'server-only';
import { prisma } from './db';
import { summarizeDays, toShiftDef } from './attendance';
import { classifyLeaveDays } from './leave';
import { calcPayslip, type PayType } from './payroll';
import { getSettings } from './settings';
import { addDays, atTime, daysInclusive, isFullMonth, toDateStr } from './time';

/** วันเริ่มงานของพนักงาน (ถ้าไม่ได้กรอก ใช้วันที่สร้างข้อมูล) */
export function employedFrom(emp: { startDate: string | null; createdAt: Date }): string {
  return emp.startDate ?? toDateStr(emp.createdAt);
}

/** ดึงการบันทึกเวลาที่ยังไม่ถูกยกเลิก ครอบคลุมช่วงวันที่ (เผื่อกะข้ามวัน 1 วัน) */
export async function loadPunches(employeeIds: number[], startDate: string, endDate: string) {
  return prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      voidedAt: null,
      timestamp: { gte: atTime(addDays(startDate, -1), '00:00'), lt: atTime(addDays(endDate, 2), '00:00') },
    },
    orderBy: { timestamp: 'asc' },
  });
}

export async function loadHolidays(startDate: string, endDate: string) {
  return prisma.holiday.findMany({ where: { date: { gte: startDate, lte: endDate } } });
}

export function holidaySetFor(holidays: { date: string; storeId: number | null }[], storeId: number | null) {
  return new Set(holidays.filter((h) => h.storeId === null || h.storeId === storeId).map((h) => h.date));
}

/**
 * วันลาที่อนุมัติแล้ว — โหลดตั้งแต่ต้นปีของ startDate เพื่อให้นับสิทธิ์ลาต่อปีได้ถูกต้อง
 */
export async function loadLeaveContext(employeeIds: number[], startDate: string, endDate: string) {
  const yearStart = `${startDate.slice(0, 4)}-01-01`;
  const [requests, holidays] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { employeeId: { in: employeeIds }, status: 'APPROVED', endDate: { gte: yearStart }, startDate: { lte: endDate } },
      include: { leaveType: true },
    }),
    loadHolidays(yearStart, endDate),
  ]);
  return { requests, holidays };
}

export function leavesFor(
  ctx: Awaited<ReturnType<typeof loadLeaveContext>>,
  emp: { id: number; storeId: number | null; shift: Parameters<typeof toShiftDef>[0] },
) {
  return classifyLeaveDays(
    ctx.requests.filter((r) => r.employeeId === emp.id),
    toShiftDef(emp.shift),
    holidaySetFor(ctx.holidays, emp.storeId),
  );
}

/** สรุปรายวันของพนักงาน 1 คนในช่วงวันที่ */
export async function employeeDays(employeeId: number, startDate: string, endDate: string) {
  const emp = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId }, include: { shift: true } });
  const [punches, holidays, settings, leaveCtx] = await Promise.all([
    loadPunches([employeeId], startDate, endDate),
    loadHolidays(startDate, endDate),
    getSettings(),
    loadLeaveContext([employeeId], startDate, endDate),
  ]);
  return summarizeDays({
    leaves: leavesFor(leaveCtx, emp),
    punches,
    shift: toShiftDef(emp.shift),
    holidays: holidaySetFor(holidays, emp.storeId),
    startDate,
    endDate,
    today: toDateStr(new Date()),
    otBlockMinutes: settings.otBlockMinutes,
    employedFrom: employedFrom(emp),
  });
}

/** คำนวณ (หรือคำนวณใหม่) สลิปทุกคนในงวด — ทำได้เฉพาะงวดที่ยังเป็นร่าง */
export async function computePeriod(periodId: number) {
  const period = await prisma.payrollPeriod.findUniqueOrThrow({ where: { id: periodId }, include: { payslips: true } });
  if (period.status !== 'DRAFT') throw new Error('งวดนี้อนุมัติแล้ว แก้ไขไม่ได้');

  const settings = await getSettings();
  const all = await prisma.employee.findMany({
    where: { active: true, baseSalary: { gt: 0 } },
    include: { shift: true },
  });
  // ไม่รวมพนักงานที่เริ่มงานหลังงวดนี้
  const employees = all.filter((e) => employedFrom(e) <= period.endDate);
  // แลกรางวัลที่อนุมัติแล้วและยังไม่ได้จ่าย → จ่ายในงวดนี้
  const redemptions = await prisma.rewardRedemption.findMany({
    where: { employeeId: { in: employees.map((e) => e.id) }, status: 'APPROVED', OR: [{ payslipPeriodId: null }, { payslipPeriodId: periodId }] },
  });
  const [punches, holidays, leaveCtx] = await Promise.all([
    loadPunches(employees.map((e) => e.id), period.startDate, period.endDate),
    loadHolidays(period.startDate, period.endDate),
    loadLeaveContext(employees.map((e) => e.id), period.startDate, period.endDate),
  ]);
  const today = toDateStr(new Date());
  const existing = new Map(period.payslips.map((p) => [p.employeeId, p]));

  await prisma.$transaction([
    // ลบสลิปของคนที่ไม่อยู่ในงวดนี้แล้ว (เช่น ปิดใช้งาน)
    prisma.payslip.deleteMany({ where: { periodId, employeeId: { notIn: employees.map((e) => e.id) } } }),
    ...employees.map((emp) => {
      // เริ่มงานกลางงวด → คิดตั้งแต่วันเริ่มงาน และเงินเดือนคิดตามสัดส่วน
      const start = employedFrom(emp) > period.startDate ? employedFrom(emp) : period.startDate;
      const days = summarizeDays({
        leaves: leavesFor(leaveCtx, emp),
        punches: punches.filter((p) => p.employeeId === emp.id),
        shift: toShiftDef(emp.shift),
        holidays: holidaySetFor(holidays, emp.storeId),
        startDate: start,
        endDate: period.endDate,
        today,
        otBlockMinutes: settings.otBlockMinutes,
      });
      const prev = existing.get(emp.id);
      const result = calcPayslip(
        {
          payType: emp.payType as PayType,
          baseSalary: emp.baseSalary,
          allowance: emp.allowance,
          bonus: prev?.bonus ?? 0,
          rewardPay: redemptions.filter((r) => r.employeeId === emp.id).reduce((a, r) => a + r.amount, 0),
          otherDeduction: prev?.otherDeduction ?? 0,
          socialSecurity: emp.socialSecurity,
          taxDeduction: emp.taxDeduction,
          days,
          periodDays: daysInclusive(start, period.endDate),
          fullMonth: isFullMonth(start, period.endDate),
        },
        settings,
      );
      const data = { ...result, payType: emp.payType, baseSalary: emp.baseSalary };
      return prisma.payslip.upsert({
        where: { periodId_employeeId: { periodId, employeeId: emp.id } },
        update: data,
        create: { ...data, periodId, employeeId: emp.id },
      });
    }),
  ]);
  if (redemptions.length) {
    await prisma.rewardRedemption.updateMany({ where: { id: { in: redemptions.map((r) => r.id) } }, data: { payslipPeriodId: periodId } });
  }
  await prisma.payrollPeriod.update({ where: { id: periodId }, data: { computedAt: new Date() } });
}

/** คำนวณงวดที่ยังเป็นร่างซึ่งครอบคลุมช่วงวันที่นี้ใหม่ (หลังแก้เวลา/อนุมัติลา) */
export async function recomputeDraftPeriods(startDate: string, endDate: string = startDate) {
  const periods = await prisma.payrollPeriod.findMany({
    where: { status: 'DRAFT', startDate: { lte: endDate }, endDate: { gte: startDate } },
  });
  for (const p of periods) await computePeriod(p.id);
}
