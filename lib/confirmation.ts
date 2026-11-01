/** ตัวเลขในสลิปที่พนักงานยืนยัน — ถ้าเปลี่ยนหลังยืนยัน ต้องยืนยันใหม่ */
export function slipSnapshot(s: {
  workDays: number; absentDays: number; leaveDays: number; unpaidLeaveDays: number; workMinutes: number;
  lateMinutes: number; otMinutes: number; holidayWorkMinutes: number; holidayOtMinutes: number; netPay: number;
}): string {
  return JSON.stringify([
    s.workDays, s.absentDays, s.leaveDays, s.unpaidLeaveDays, s.workMinutes,
    s.lateMinutes, s.otMinutes, s.holidayWorkMinutes, s.holidayOtMinutes, s.netPay,
  ]);
}

export type ConfirmState = 'NONE' | 'CONFIRMED' | 'STALE' | 'DISPUTED' | 'RESOLVED';

/**
 * NONE      ยังไม่ยืนยัน
 * CONFIRMED ยืนยันแล้ว และตัวเลขยังตรง
 * STALE     เคยยืนยัน แต่ตัวเลขเปลี่ยน → ต้องยืนยันใหม่
 * DISPUTED  แจ้งแก้ไข รอผู้ดูแล
 * RESOLVED  แจ้งแก้ไขแล้ว ผู้ดูแลปรับข้อมูลแล้ว → รอพนักงานยืนยันอีกครั้ง
 */
export function confirmState(conf: { status: string; snapshot: string } | null | undefined, currentSnapshot: string): ConfirmState {
  if (!conf) return 'NONE';
  const same = conf.snapshot === currentSnapshot;
  if (conf.status === 'CONFIRMED') return same ? 'CONFIRMED' : 'STALE';
  return same ? 'DISPUTED' : 'RESOLVED';
}

export const CONFIRM_LABEL: Record<ConfirmState, string> = {
  NONE: 'ยังไม่ยืนยัน',
  CONFIRMED: 'ยืนยันแล้ว',
  STALE: 'ข้อมูลเปลี่ยน รอยืนยันใหม่',
  DISPUTED: 'แจ้งแก้ไข',
  RESOLVED: 'แก้แล้ว รอยืนยันใหม่',
};

export const CONFIRM_BADGE: Record<ConfirmState, string> = {
  NONE: '',
  CONFIRMED: 'badge-ok',
  STALE: 'badge-warn',
  DISPUTED: 'badge-err',
  RESOLVED: 'badge-warn',
};

/** พนักงานต้องทำอะไรหรือไม่ */
export const needsStaffAction = (s: ConfirmState) => s === 'NONE' || s === 'STALE' || s === 'RESOLVED';

/** ยืนยันได้ตั้งแต่วันสุดท้ายของงวด จนกว่าผู้ดูแลจะอนุมัติ */
export const canConfirm = (period: { status: string; endDate: string }, today: string) => period.status === 'DRAFT' && today >= period.endDate;
