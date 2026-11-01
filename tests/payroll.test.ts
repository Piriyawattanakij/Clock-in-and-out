import { describe, expect, it } from 'vitest';
import { calcPayslip, progressiveTax, DEFAULT_PAYROLL_SETTINGS as S } from '@/lib/payroll';
import type { DaySummary } from '@/lib/attendance';

function day(over: Partial<DaySummary>): DaySummary {
  return { date: '2026-11-02', scheduled: true, holiday: false, firstIn: null, lastOut: null, workedMinutes: 480, regularMinutes: 480, lateMinutes: 0, otMinutes: 0, status: 'PRESENT', leave: null, ...over };
}
const common = { allowance: 0, bonus: 0, otherDeduction: 0, socialSecurity: false, taxDeduction: 0, periodDays: 30, fullMonth: true };

describe('progressiveTax', () => {
  it('follows Thai brackets', () => {
    expect(progressiveTax(150_000)).toBe(0);
    expect(progressiveTax(300_000)).toBe(7_500);
    expect(progressiveTax(500_000)).toBe(27_500);
  });
});

describe('calcPayslip', () => {
  it('monthly: OT 1.5x, late and absent deductions', () => {
    const r = calcPayslip({
      ...common,
      payType: 'MONTHLY',
      baseSalary: 3_000_000, // 30,000 บาท → 1,000/วัน, 125/ชม.
      days: [day({ otMinutes: 120, lateMinutes: 30 }), day({ status: 'ABSENT', workedMinutes: 0, regularMinutes: 0 })],
    });
    expect(r.basePay).toBe(3_000_000);
    expect(r.otPay).toBe(37_500); // 2 ชม. × 125 × 1.5
    expect(r.lateDeduction).toBe(6_250); // 0.5 ชม. × 125
    expect(r.absentDeduction).toBe(100_000);
    expect(r.grossPay).toBe(3_000_000 + 37_500 - 6_250 - 100_000);
  });

  it('daily: paid per day worked, holiday work 2x and holiday OT 3x', () => {
    const r = calcPayslip({
      ...common,
      payType: 'DAILY',
      baseSalary: 40_000, // 400 บาท/วัน → 50/ชม.
      days: [day({}), day({}), day({ scheduled: false, holiday: true, regularMinutes: 480, otMinutes: 60 })],
    });
    expect(r.workDays).toBe(2);
    expect(r.basePay).toBe(80_000);
    expect(r.holidayPay).toBe(80_000); // 8 ชม. × 50 × 2
    expect(r.otPay).toBe(15_000); // 1 ชม. × 50 × 3
  });

  it('hourly: paid per regular minute, no late deduction', () => {
    const r = calcPayslip({ ...common, payType: 'HOURLY', baseSalary: 6_000, days: [day({ regularMinutes: 450, lateMinutes: 30 })] });
    expect(r.basePay).toBe(45_000);
    expect(r.lateDeduction).toBe(0);
  });

  it('social security is capped and tax is withheld', () => {
    const r = calcPayslip({ ...common, socialSecurity: true, payType: 'MONTHLY', baseSalary: 5_000_000, days: [day({})] });
    expect(r.socialSecurity).toBe(Math.round(S.ssoWageCap * 100 * 0.05));
    // 50,000×12 = 600,000 − ค่าใช้จ่าย 100,000 − ส่วนตัว 60,000 − ประกันสังคม 9,000 = 431,000 → ภาษีปี 20,600
    expect(r.withholdingTax).toBe(Math.round((20_600 / 12) * 100));
    expect(r.netPay).toBe(r.grossPay - r.socialSecurity - r.withholdingTax);
  });

  it('prorates monthly salary for a half-month period', () => {
    const r = calcPayslip({ ...common, payType: 'MONTHLY', baseSalary: 3_000_000, days: [], periodDays: 15, fullMonth: false });
    expect(r.basePay).toBe(1_500_000);
  });
});
