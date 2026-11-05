import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIFT, summarizeDays, type Punch } from '@/lib/attendance';
import { classifyLeaveDays } from '@/lib/leave';
import { calcPayslip } from '@/lib/payroll';

const t = (s: string) => new Date(`${s}:00+07:00`);
const unpaid = { id: 9, name: 'ลาไม่รับเงิน', color: '#999', paid: false, annualQuota: null };
const base = { shift: DEFAULT_SHIFT, holidays: new Set<string>(), startDate: '2026-11-02', endDate: '2026-11-04', today: '2026-11-30', exempt: true };

describe('management (exempt) days', () => {
  it('scheduled days without punches count as full work days, not absent', () => {
    const days = summarizeDays({ ...base, punches: [] });
    expect(days.map((d) => d.status)).toEqual(['EXEMPT', 'EXEMPT', 'EXEMPT']);
    expect(days.every((d) => d.regularMinutes === 480)).toBe(true);
  });
  it('late punches and overtime have no effect', () => {
    const p: Punch[] = [{ type: 'IN', timestamp: t('2026-11-02T11:30') }, { type: 'OUT', timestamp: t('2026-11-02T22:00') }];
    const [d] = summarizeDays({ ...base, punches: p, endDate: '2026-11-02' });
    expect(d.status).toBe('EXEMPT');
    expect(d.lateMinutes).toBe(0);
    expect(d.otMinutes).toBe(0);
  });
  it('future days stay pending; days off stay off', () => {
    const days = summarizeDays({ ...base, startDate: '2026-11-01', endDate: '2026-11-03', today: '2026-11-02', punches: [] });
    expect(days.map((d) => d.status)).toEqual(['OFF', 'EXEMPT', 'PENDING']);
  });
  it('payroll: full salary, only unpaid leave is deducted', () => {
    const leaves = classifyLeaveDays([{ id: 1, startDate: '2026-11-03', endDate: '2026-11-03', leaveType: unpaid }], DEFAULT_SHIFT, new Set());
    const days = summarizeDays({ ...base, punches: [], leaves });
    const r = calcPayslip({
      payType: 'MONTHLY', baseSalary: 3_000_000, allowance: 0, bonus: 0, otherDeduction: 0, socialSecurity: false, taxDeduction: 0,
      days, periodDays: 30, fullMonth: true,
    });
    expect(r.workDays).toBe(2);
    expect(r.absentDays).toBe(0);
    expect(r.lateDeduction).toBe(0);
    expect(r.otPay).toBe(0);
    expect(r.absentDeduction).toBe(100_000); // ลาไม่รับเงิน 1 วัน × 1,000
    expect(r.basePay).toBe(3_000_000);
  });
});
