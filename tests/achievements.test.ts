import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIFT, summarizeDays, type Punch } from '@/lib/attendance';
import { addYears, consecutivePerfectMonths, evaluateMonth, isPerfectMonth, punctualStreaks } from '@/lib/achievements';
import { classifyLeaveDays } from '@/lib/leave';
import { eachDate, weekday } from '@/lib/time';

const t = (s: string) => new Date(`${s}:00+07:00`);
/** เข้า 08:55 ออก 18:00 ทุกวันทำงาน ยกเว้นวันที่ระบุ */
function punches(start: string, end: string, opts: { late?: string[]; skip?: string[]; early?: boolean } = {}): Punch[] {
  const out: Punch[] = [];
  for (const d of eachDate(start, end)) {
    if (!DEFAULT_SHIFT.workDays.includes(weekday(d)) || opts.skip?.includes(d)) continue;
    out.push({ type: 'IN', timestamp: t(`${d}T${opts.late?.includes(d) ? '09:30' : opts.early ? '08:45' : '08:58'}`) });
    out.push({ type: 'OUT', timestamp: t(`${d}T18:00`) });
  }
  return out;
}
const sickType = { id: 1, name: 'ลาป่วย', color: '#000', paid: true, annualQuota: 30, sick: true };
const personal = { id: 2, name: 'ลากิจ', color: '#000', paid: true, annualQuota: 3 };
const summary = (p: Punch[], leaves = new Map()) =>
  summarizeDays({ punches: p, shift: DEFAULT_SHIFT, holidays: new Set(), startDate: '2026-11-01', endDate: '2026-11-30', today: '2026-12-01', leaves });
const base = { month: '2026-11', employedFrom: '2026-01-05', shift: DEFAULT_SHIFT, sickGraceDays: 2, perfectMonths: new Set<string>(), announcements: [] };

describe('isPerfectMonth', () => {
  it('perfect when no absence and no lateness', () => {
    expect(isPerfectMonth({ ...base, monthDays: summary(punches('2026-11-01', '2026-11-30')) })).toBe(true);
  });
  it('one late day breaks it', () => {
    expect(isPerfectMonth({ ...base, monthDays: summary(punches('2026-11-01', '2026-11-30', { late: ['2026-11-10'] })) })).toBe(false);
  });
  it('sick leave within grace is fine, personal leave is not', () => {
    const p = punches('2026-11-01', '2026-11-30', { skip: ['2026-11-10', '2026-11-11'] });
    const sick = classifyLeaveDays([{ id: 1, startDate: '2026-11-10', endDate: '2026-11-11', leaveType: sickType }], DEFAULT_SHIFT, new Set());
    const pers = classifyLeaveDays([{ id: 1, startDate: '2026-11-10', endDate: '2026-11-11', leaveType: personal }], DEFAULT_SHIFT, new Set());
    expect(isPerfectMonth({ ...base, monthDays: summary(p, sick) })).toBe(true);
    expect(isPerfectMonth({ ...base, monthDays: summary(p, pers) })).toBe(false);
    expect(isPerfectMonth({ ...base, sickGraceDays: 1, monthDays: summary(p, sick) })).toBe(false);
  });
  it('requires a full month of employment', () => {
    expect(isPerfectMonth({ ...base, employedFrom: '2026-11-03', monthDays: summary(punches('2026-11-03', '2026-11-30')) })).toBe(false);
  });
});

describe('streaks', () => {
  it('counts punctual working days, leave does not break it', () => {
    const p = punches('2026-11-01', '2026-11-30', { late: ['2026-11-10'], skip: ['2026-11-20'] });
    const leaves = classifyLeaveDays([{ id: 1, startDate: '2026-11-20', endDate: '2026-11-20', leaveType: sickType }], DEFAULT_SHIFT, new Set());
    const s = punctualStreaks(summary(p, leaves));
    // 11-01..11-30 มี 25 วันทำงาน: สายวันที่ 10 (วันทำงานที่ 8) → ก่อนหน้า 7 วัน, หลังจากนั้น 17 วัน (ลา 1 วันไม่นับ)
    expect(s.max).toBe(16);
    expect(s.current).toBe(16);
  });
  it('consecutive perfect months', () => {
    expect(consecutivePerfectMonths('2026-11', true, new Set(['2026-10', '2026-09', '2026-07']))).toBe(3);
    expect(consecutivePerfectMonths('2026-11', false, new Set(['2026-10']))).toBe(0);
  });
});

describe('evaluateMonth', () => {
  it('awards monthly and milestone badges', () => {
    const days = summary(punches('2026-11-01', '2026-11-30', { early: true }));
    const keys = evaluateMonth({ ...base, monthDays: days, historyDays: days, employedFrom: '2025-11-15', perfectMonths: new Set(['2026-10', '2026-09']) }).map((a) => `${a.key}:${a.periodKey}`);
    expect(keys).toEqual(expect.arrayContaining([
      'perfect_month:2026-11', 'punctual_month:2026-11', 'early_bird:2026-11', 'never_forget:2026-11',
      'streak_perfect_3:once', 'probation:once', 'tenure_1:once',
    ]));
    expect(keys).not.toContain('tenure_3:once');
    expect(keys).not.toContain('hero_shift:2026-11');
  });
  it('hero shift needs two days worked on days off', () => {
    const p = [...punches('2026-11-01', '2026-11-30'), { type: 'IN', timestamp: t('2026-11-08T09:00') }, { type: 'OUT', timestamp: t('2026-11-08T17:00') }, { type: 'IN', timestamp: t('2026-11-15T09:00') }, { type: 'OUT', timestamp: t('2026-11-15T17:00') }];
    const days = summary(p);
    expect(evaluateMonth({ ...base, monthDays: days, historyDays: days }).map((a) => a.key)).toContain('hero_shift');
  });
  it('news reader requires reading every announcement within a day', () => {
    const days = summary([]);
    const ok = [{ createdAt: t('2026-11-03T10:00'), readAt: t('2026-11-04T09:00') }];
    const slow = [{ createdAt: t('2026-11-03T10:00'), readAt: t('2026-11-05T09:00') }];
    expect(evaluateMonth({ ...base, monthDays: days, historyDays: days, announcements: ok }).map((a) => a.key)).toContain('news_reader');
    expect(evaluateMonth({ ...base, monthDays: days, historyDays: days, announcements: slow }).map((a) => a.key)).not.toContain('news_reader');
  });
  it('handles Feb 29 anniversaries', () => {
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
  });
});
