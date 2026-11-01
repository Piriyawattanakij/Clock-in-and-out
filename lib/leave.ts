import type { ShiftDef } from './attendance';
import { eachDate, weekday } from './time';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: 'รออนุมัติ',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิกแล้ว',
};

export const LEAVE_STATUS_BADGE: Record<LeaveStatus, string> = {
  PENDING: 'badge-warn',
  APPROVED: 'badge-ok',
  REJECTED: 'badge-err',
  CANCELLED: '',
};

export const MAX_LEAVE_RANGE_DAYS = 31;

export interface LeaveTypeDef {
  id: number;
  name: string;
  color: string;
  paid: boolean;
  annualQuota: number | null;
}

export interface LeaveDay {
  requestId: number;
  typeId: number;
  name: string;
  color: string;
  /** ได้รับค่าจ้างวันนี้หรือไม่ (ลาเกินสิทธิ์ต่อปี = ไม่ได้รับ) */
  paid: boolean;
}

/** วันทำงานตามกะในช่วงวันที่ (ไม่นับวันหยุดประจำสัปดาห์และวันหยุดนักขัตฤกษ์) */
export function workingDates(start: string, end: string, shift: ShiftDef, holidays: Set<string>): string[] {
  return eachDate(start, end).filter((d) => !holidays.has(d) && shift.workDays.includes(weekday(d)));
}

/**
 * แปลงคำขอลาที่อนุมัติแล้ว เป็นรายวัน พร้อมบอกว่าวันไหนได้รับค่าจ้าง
 * สิทธิ์ลาต่อปีนับตามลำดับวันที่ — ลาเกินสิทธิ์ส่วนที่เกินคิดเป็นลาไม่รับเงิน
 * ควรส่งคำขอทั้งปีปฏิทินเข้ามา เพื่อให้นับสิทธิ์ที่ใช้ไปก่อนหน้าได้ถูกต้อง
 */
export function classifyLeaveDays(
  requests: { id: number; startDate: string; endDate: string; leaveType: LeaveTypeDef }[],
  shift: ShiftDef,
  holidays: Set<string>,
): Map<string, LeaveDay> {
  const out = new Map<string, LeaveDay>();
  const used = new Map<string, number>(); // `${year}:${typeId}` → วันที่ใช้ไป
  const sorted = [...requests].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id - b.id);
  for (const r of sorted) {
    const t = r.leaveType;
    for (const date of workingDates(r.startDate, r.endDate, shift, holidays)) {
      if (out.has(date)) continue; // คำขอซ้อนกัน — ใช้อันแรก
      const key = `${date.slice(0, 4)}:${t.id}`;
      const n = used.get(key) ?? 0;
      used.set(key, n + 1);
      out.set(date, { requestId: r.id, typeId: t.id, name: t.name, color: t.color, paid: t.paid && (t.annualQuota === null || n < t.annualQuota) });
    }
  }
  return out;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
