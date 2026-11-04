/** จำกัดการเดารหัสผ่าน: ผิดเกินจำนวนที่กำหนดภายในช่วงเวลา → ล็อกชั่วคราว */
export interface ThrottleRule {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
}

export const CODE_RULE: ThrottleRule = { maxFailures: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
export const IP_RULE: ThrottleRule = { maxFailures: 20, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };

export interface ThrottleState {
  failures: number;
  windowStart: Date;
  lockedUntil: Date | null;
}

/** ยังถูกล็อกอยู่กี่มิลลิวินาที (0 = ไม่ล็อก) */
export function lockRemaining(s: ThrottleState | null | undefined, now: Date): number {
  return s?.lockedUntil ? Math.max(0, s.lockedUntil.getTime() - now.getTime()) : 0;
}

/** สถานะใหม่หลังใส่รหัสผิด 1 ครั้ง */
export function afterFailure(s: ThrottleState | null | undefined, now: Date, rule: ThrottleRule): ThrottleState {
  const fresh = !s || now.getTime() - s.windowStart.getTime() > rule.windowMs || (s.lockedUntil !== null && s.lockedUntil <= now);
  const failures = fresh ? 1 : s.failures + 1;
  return {
    failures,
    windowStart: fresh ? now : s.windowStart,
    lockedUntil: failures >= rule.maxFailures ? new Date(now.getTime() + rule.lockMs) : null,
  };
}
