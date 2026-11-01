import { addDays, atTime, eachDate, toDateStr, weekday } from './time';
import type { LeaveDay } from './leave';

/** ถ้าบันทึกเข้าแล้วไม่บันทึกออกเกินเวลานี้ ถือว่าลืมบันทึกออก และครั้งถัดไปจะเป็นการบันทึกเข้าใหม่ */
export const MAX_SESSION_HOURS = 20;
const MAX_SESSION_MS = MAX_SESSION_HOURS * 3600_000;

export type PunchType = 'IN' | 'OUT';

export interface Punch {
  type: string;
  timestamp: Date;
}

export interface ShiftDef {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  lateGraceMinutes: number;
  workDays: number[];
}

export interface Session {
  in: Date;
  out: Date | null;
}

export type DayStatus = 'PRESENT' | 'INCOMPLETE' | 'ABSENT' | 'LEAVE' | 'OFF' | 'PENDING';

export interface DaySummary {
  date: string;
  /** เป็นวันทำงานตามกะ (ไม่ใช่วันหยุดประจำสัปดาห์/วันหยุดนักขัตฤกษ์) */
  scheduled: boolean;
  holiday: boolean;
  firstIn: Date | null;
  lastOut: Date | null;
  workedMinutes: number;
  /** นาทีทำงานปกติ (ไม่รวม OT) */
  regularMinutes: number;
  lateMinutes: number;
  otMinutes: number;
  status: DayStatus;
  /** วันลาที่อนุมัติแล้ว (ถ้ามี) */
  leave: LeaveDay | null;
}

export const DEFAULT_SHIFT: ShiftDef = {
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
  lateGraceMinutes: 5,
  workDays: [1, 2, 3, 4, 5, 6],
};

export function parseWorkDays(s: string): number[] {
  return s
    .split(',')
    .map((x) => parseInt(x, 10))
    .filter((n) => n >= 0 && n <= 6);
}

export function toShiftDef(s: { startTime: string; endTime: string; breakMinutes: number; lateGraceMinutes: number; workDays: string } | null | undefined): ShiftDef {
  return s ? { ...s, workDays: parseWorkDays(s.workDays) } : DEFAULT_SHIFT;
}

/** ระบบเป็นคนตัดสินว่าครั้งถัดไปเป็นเข้า/ออก (ผู้ใช้เลือกเองไม่ได้) */
export function nextPunchType(last: Punch | null | undefined, now = new Date()): PunchType {
  return last && last.type === 'IN' && now.getTime() - last.timestamp.getTime() < MAX_SESSION_MS ? 'OUT' : 'IN';
}

/** จับคู่ IN/OUT เป็นช่วงการทำงาน */
export function buildSessions(punches: Punch[]): Session[] {
  const sorted = [...punches].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sessions: Session[] = [];
  let open: Session | null = null;
  for (const p of sorted) {
    if (p.type === 'IN') {
      if (open) sessions.push(open); // บันทึกเข้าซ้ำโดยไม่บันทึกออก = ช่วงก่อนหน้าไม่สมบูรณ์
      open = { in: p.timestamp, out: null };
    } else if (open) {
      if (p.timestamp.getTime() - open.in.getTime() <= MAX_SESSION_MS) open.out = p.timestamp;
      sessions.push(open);
      open = null;
    }
    // OUT ที่ไม่มี IN นำหน้า → ไม่นำมาคิด
  }
  if (open) sessions.push(open);
  return sessions;
}

function shiftBounds(date: string, shift: ShiftDef) {
  const start = atTime(date, shift.startTime);
  let end = atTime(date, shift.endTime);
  if (end <= start) end = atTime(addDays(date, 1), shift.endTime); // กะข้ามวัน
  return { start, end };
}

const mins = (ms: number) => Math.floor(ms / 60000);
const floorBlock = (m: number, block: number) => (block > 1 ? Math.floor(m / block) * block : m);

export interface SummarizeOptions {
  punches: Punch[];
  shift: ShiftDef;
  holidays: Set<string>;
  startDate: string;
  endDate: string;
  /** วันนี้ (YYYY-MM-DD) — วันก่อนหน้านี้ที่ไม่มีการบันทึกเวลาจะถือว่าขาดงาน */
  today: string;
  /** ปัด OT ลงเป็นช่วงละกี่นาที (เช่น 30) */
  otBlockMinutes?: number;
  /** วันเริ่มงาน — ก่อนหน้านี้ไม่นับเป็นวันทำงาน/ขาดงาน */
  employedFrom?: string | null;
  /** วันลาที่อนุมัติแล้ว (จาก classifyLeaveDays) */
  leaves?: Map<string, LeaveDay>;
}

/** สรุปการทำงานรายวัน: ชั่วโมงทำงาน, มาสาย, OT, ขาดงาน */
export function summarizeDays(opts: SummarizeOptions): DaySummary[] {
  const { shift, holidays, today } = opts;
  const block = opts.otBlockMinutes ?? 30;
  const byDate = new Map<string, Session[]>();
  for (const s of buildSessions(opts.punches)) {
    const d = toDateStr(s.in); // ช่วงทำงานนับเป็นของวันที่บันทึกเข้า
    const list = byDate.get(d);
    if (list) list.push(s);
    else byDate.set(d, [s]);
  }

  return eachDate(opts.startDate, opts.endDate).map((date): DaySummary => {
    const holiday = holidays.has(date);
    const employed = !opts.employedFrom || date >= opts.employedFrom;
    const scheduled = employed && !holiday && shift.workDays.includes(weekday(date));
    const list = byDate.get(date) ?? [];
    const { start, end } = shiftBounds(date, shift);
    const standard = Math.max(0, mins(end.getTime() - start.getTime()) - shift.breakMinutes);
    const leave = scheduled ? (opts.leaves?.get(date) ?? null) : null;
    const empty = { date, scheduled, holiday, firstIn: null, lastOut: null, workedMinutes: 0, regularMinutes: 0, lateMinutes: 0, otMinutes: 0, leave };

    if (!employed) return { ...empty, status: 'OFF' };
    if (list.length === 0) {
      const status: DayStatus = !scheduled ? 'OFF' : leave ? 'LEAVE' : date < today ? 'ABSENT' : 'PENDING';
      return { ...empty, status };
    }

    const firstIn = list[0].in;
    const closed = list.filter((s): s is { in: Date; out: Date } => s.out !== null);
    const lastOut = closed.length ? closed[closed.length - 1].out : null;
    let worked = closed.reduce((a, s) => a + mins(s.out.getTime() - s.in.getTime()), 0);
    // บันทึกครั้งเดียวทั้งวัน (ไม่ได้บันทึกออกพักเที่ยง) → หักเวลาพักให้อัตโนมัติ
    if (closed.length === 1 && worked > 300) worked = Math.max(0, worked - shift.breakMinutes);

    let late = 0;
    let ot = 0;
    let regular: number;
    if (scheduled) {
      late = Math.max(0, mins(firstIn.getTime() - start.getTime()));
      if (late <= shift.lateGraceMinutes) late = 0;
      if (lastOut) ot = floorBlock(Math.max(0, mins(lastOut.getTime() - end.getTime())), block);
      regular = Math.max(0, Math.min(worked - ot, standard));
    } else {
      // ทำงานในวันหยุด: ส่วนที่เกินชั่วโมงทำงานปกติ = OT ในวันหยุด
      regular = Math.min(worked, standard);
      ot = floorBlock(Math.max(0, worked - regular), block);
    }

    return {
      ...empty,
      firstIn,
      lastOut,
      workedMinutes: worked,
      regularMinutes: regular,
      lateMinutes: late,
      otMinutes: ot,
      status: list.some((s) => !s.out) ? 'INCOMPLETE' : 'PRESENT',
    };
  });
}

export const STATUS_LABEL: Record<DayStatus, string> = {
  PRESENT: 'มาทำงาน',
  INCOMPLETE: 'ไม่ได้บันทึกออก',
  ABSENT: 'ขาดงาน',
  LEAVE: 'ลา',
  OFF: 'วันหยุด',
  PENDING: '-',
};
