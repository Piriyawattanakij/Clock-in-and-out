import { describe, expect, it } from 'vitest';
import { classifyLeaveDays, rangesOverlap, workingDates } from '@/lib/leave';
import { DEFAULT_SHIFT, summarizeDays } from '@/lib/attendance';
import { calcPayslip } from '@/lib/payroll';

const sick = { id: 1, name: 'ลาป่วย', color: '#f00', paid: true, annualQuota: 30 };
const personal = { id: 2, name: 'ลากิจ', color: '#0f0', paid: true, annualQuota: 3 };
const unpaid = { id: 3, name: 'ลาไม่รับเงิน', color: '#999', paid: false, annualQuota: null };
const none = new Set<string>();

describe('workingDates', () => {
  it('skips Sundays and holidays', () => {
    // 2026-11-01 อาทิตย์ → 2026-11-04 พุธ, 11-03 เป็นวันหยุด
    expect(workingDates('2026-11-01', '2026-11-04', DEFAULT_SHIFT, new Set(['2026-11-03']))).toEqual(['2026-11-02', '2026-11-04']);
  });
});

describe('classifyLeaveDays', () => {
  it('marks days beyond the annual quota as unpaid', () => {
    const m = classifyLeaveDays(
      [
        { id: 10, startDate: '2026-11-02', endDate: '2026-11-03', leaveType: personal },
        { id: 11, startDate: '2026-11-05', endDate: '2026-11-06', leaveType: personal },
      ],
      DEFAULT_SHIFT,
      none,
    );
    expect([...m.values()].map((d) => d.paid)).toEqual([true, true, true, false]);
  });
  it('quota resets each calendar year', () => {
    const m = classifyLeaveDays(
      [
        { id: 1, startDate: '2026-12-28', endDate: '2026-12-31', leaveType: personal },
        { id: 2, startDate: '2027-01-04', endDate: '2027-01-04', leaveType: personal },
      ],
      DEFAULT_SHIFT,
      none,
    );
    expect(m.get('2026-12-31')!.paid).toBe(false);
    expect(m.get('2027-01-04')!.paid).toBe(true);
  });
  it('unpaid types are never paid', () => {
    const m = classifyLeaveDays([{ id: 1, startDate: '2026-11-02', endDate: '2026-11-02', leaveType: unpaid }], DEFAULT_SHIFT, none);
    expect(m.get('2026-11-02')!.paid).toBe(false);
  });
});

describe('rangesOverlap', () => {
  it('detects overlap', () => {
    expect(rangesOverlap('2026-11-02', '2026-11-04', '2026-11-04', '2026-11-05')).toBe(true);
    expect(rangesOverlap('2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05')).toBe(false);
  });
});

describe('leave in attendance and payroll', () => {
  const leaves = classifyLeaveDays(
    [
      { id: 1, startDate: '2026-11-02', endDate: '2026-11-02', leaveType: sick },
      { id: 2, startDate: '2026-11-03', endDate: '2026-11-03', leaveType: unpaid },
    ],
    DEFAULT_SHIFT,
    none,
  );
  const days = summarizeDays({ punches: [], shift: DEFAULT_SHIFT, holidays: none, startDate: '2026-11-02', endDate: '2026-11-04', today: '2026-11-30', leaves });
  it('leave days are LEAVE, not ABSENT', () => {
    expect(days.map((d) => d.status)).toEqual(['LEAVE', 'LEAVE', 'ABSENT']);
  });
  const common = { allowance: 0, bonus: 0, otherDeduction: 0, socialSecurity: false, taxDeduction: 0, periodDays: 30, fullMonth: true, days };
  it('monthly: paid leave not deducted, unpaid leave deducted like absence', () => {
    const r = calcPayslip({ ...common, payType: 'MONTHLY', baseSalary: 3_000_000 });
    expect(r.leaveDays).toBe(1);
    expect(r.unpaidLeaveDays).toBe(1);
    expect(r.absentDeduction).toBe(200_000); // ขาด 1 + ลาไม่รับเงิน 1 = 2 วัน × 1,000
  });
  it('daily: paid leave earns a day of wages', () => {
    const r = calcPayslip({ ...common, payType: 'DAILY', baseSalary: 40_000 });
    expect(r.basePay).toBe(40_000);
  });
});
