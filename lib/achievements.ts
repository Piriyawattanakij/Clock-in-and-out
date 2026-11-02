import type { DaySummary, ShiftDef } from './attendance';
import { addDays, atTime, monthRange, shiftMonth } from './time';

export const PROBATION_DAYS = 119;
const DAY_MS = 86400_000;

export interface EvalInput {
  month: string; // YYYY-MM
  /** สรุปรายวันทั้งเดือน */
  monthDays: DaySummary[];
  /** สรุปรายวันตั้งแต่วันเริ่มงานถึงสิ้นเดือน (ใช้นับ streak) */
  historyDays: DaySummary[];
  employedFrom: string;
  shift: ShiftDef;
  /** ลาป่วยได้กี่วันโดยไม่ตัดสิทธิ์ขยันเต็มเดือน */
  sickGraceDays: number;
  /** เดือนที่เคยได้ “ขยันเต็มเดือน” ก่อนหน้านี้ */
  perfectMonths: Set<string>;
  /** ประกาศในเดือนนี้ที่พนักงานควรเห็น และเวลาที่อ่าน */
  announcements: { createdAt: Date; readAt: Date | null }[];
}

export interface Award {
  key: string;
  periodKey: string;
}

const isPresent = (d: DaySummary) => d.status === 'PRESENT' || d.status === 'INCOMPLETE';

/** ขยันเต็มเดือน: ไม่ขาด ไม่สาย ไม่ลืมบันทึกออก และลาได้เฉพาะลาป่วยไม่เกินที่กำหนด */
export function isPerfectMonth(i: Pick<EvalInput, 'month' | 'monthDays' | 'employedFrom' | 'sickGraceDays'>): boolean {
  const { start } = monthRange(i.month);
  if (i.employedFrom > start) return false; // ต้องทำงานเต็มเดือน
  const sched = i.monthDays.filter((d) => d.scheduled);
  if (sched.length === 0 || !sched.some(isPresent)) return false;
  if (sched.some((d) => d.status === 'ABSENT' || d.status === 'INCOMPLETE' || d.status === 'PENDING')) return false;
  if (i.monthDays.some((d) => d.lateMinutes > 0)) return false;
  const leaves = sched.filter((d) => d.status === 'LEAVE');
  if (leaves.some((d) => !d.leave?.sick)) return false;
  return leaves.length <= i.sickGraceDays;
}

/** streak ตรงเวลาที่ยาวที่สุด และ streak ปัจจุบัน (วันลาไม่ตัด streak) */
export function punctualStreaks(days: DaySummary[]): { max: number; current: number } {
  let cur = 0;
  let max = 0;
  for (const d of days) {
    if (!d.scheduled || d.status === 'LEAVE' || d.status === 'PENDING') continue;
    if (d.status === 'PRESENT' && d.lateMinutes === 0) {
      cur++;
      if (cur > max) max = cur;
    } else cur = 0;
  }
  return { max, current: cur };
}

export function consecutivePerfectMonths(month: string, thisMonth: boolean, history: Set<string>): number {
  if (!thisMonth) return 0;
  let n = 1;
  for (let m = shiftMonth(month, -1); history.has(m); m = shiftMonth(m, -1)) n++;
  return n;
}

export function addYears(date: string, years: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y + years, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) dt.setUTCDate(0); // 29 ก.พ. → 28 ก.พ.
  return dt.toISOString().slice(0, 10);
}

/** ประเมิน achievement อัตโนมัติของพนักงาน 1 คน สำหรับเดือนที่จบแล้ว */
export function evaluateMonth(i: EvalInput): Award[] {
  const out: Award[] = [];
  const { end } = monthRange(i.month);
  const monthly = (key: string) => out.push({ key, periodKey: i.month });
  const once = (key: string) => out.push({ key, periodKey: 'once' });

  const sched = i.monthDays.filter((d) => d.scheduled);
  const present = i.monthDays.filter(isPresent);

  const perfect = isPerfectMonth(i);
  if (perfect) monthly('perfect_month');

  const schedPresent = sched.filter(isPresent).length;
  if (schedPresent > 0 && schedPresent >= Math.ceil(sched.length / 2) && present.every((d) => d.lateMinutes === 0)) monthly('punctual_month');

  if (i.monthDays.filter((d) => !d.scheduled && d.workedMinutes > 0).length >= 2) monthly('hero_shift');

  const early = i.monthDays.filter((d) => d.firstIn && d.firstIn.getTime() <= atTime(d.date, i.shift.startTime).getTime() - 10 * 60_000).length;
  if (early >= 15) monthly('early_bird');

  if (present.length >= 10 && !i.monthDays.some((d) => d.status === 'INCOMPLETE')) monthly('never_forget');

  if (i.announcements.length > 0 && i.announcements.every((a) => a.readAt && a.readAt.getTime() - a.createdAt.getTime() <= DAY_MS)) monthly('news_reader');

  const { max } = punctualStreaks(i.historyDays);
  for (const n of [30, 100, 250]) if (max >= n) once(`streak_punctual_${n}`);

  const run = consecutivePerfectMonths(i.month, perfect, i.perfectMonths);
  for (const n of [3, 6, 12]) if (run >= n) once(`streak_perfect_${n}`);

  if (addDays(i.employedFrom, PROBATION_DAYS - 1) <= end) once('probation');
  for (const y of [1, 3, 5]) if (addYears(i.employedFrom, y) <= end) once(`tenure_${y}`);

  return out;
}
