import { describe, expect, it } from 'vitest';
import { canConfirm, confirmState, needsStaffAction, slipSnapshot } from '@/lib/confirmation';

const slip = { workDays: 20, absentDays: 1, leaveDays: 1, unpaidLeaveDays: 0, workMinutes: 9600, lateMinutes: 15, otMinutes: 60, holidayWorkMinutes: 0, holidayOtMinutes: 0, netPay: 1_500_000 };
const snap = slipSnapshot(slip);
const changed = slipSnapshot({ ...slip, otMinutes: 90, netPay: 1_510_000 });

describe('confirmState', () => {
  it('tracks confirmation against the current numbers', () => {
    expect(confirmState(null, snap)).toBe('NONE');
    expect(confirmState({ status: 'CONFIRMED', snapshot: snap }, snap)).toBe('CONFIRMED');
    expect(confirmState({ status: 'CONFIRMED', snapshot: snap }, changed)).toBe('STALE');
    expect(confirmState({ status: 'DISPUTED', snapshot: snap }, snap)).toBe('DISPUTED');
    expect(confirmState({ status: 'DISPUTED', snapshot: snap }, changed)).toBe('RESOLVED');
  });
  it('knows when staff must act', () => {
    expect(['NONE', 'CONFIRMED', 'STALE', 'DISPUTED', 'RESOLVED'].filter((s) => needsStaffAction(s as never))).toEqual(['NONE', 'STALE', 'RESOLVED']);
  });
});

describe('canConfirm', () => {
  it('opens on the last day of a draft period', () => {
    const p = { status: 'DRAFT', endDate: '2026-11-30' };
    expect(canConfirm(p, '2026-11-29')).toBe(false);
    expect(canConfirm(p, '2026-11-30')).toBe(true);
    expect(canConfirm({ ...p, status: 'APPROVED' }, '2026-12-01')).toBe(false);
  });
});
