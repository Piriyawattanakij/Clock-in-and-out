import { describe, expect, it } from 'vitest';
import { buildSessions, nextPunchType, summarizeDays, DEFAULT_SHIFT, type Punch } from '@/lib/attendance';

const t = (s: string) => new Date(`${s}:00+07:00`);
const p = (type: 'IN' | 'OUT', s: string): Punch => ({ type, timestamp: t(s) });

// 2026-11-02 = จันทร์, 2026-11-01 = อาทิตย์ (วันหยุดตามกะเริ่มต้น จ.–ส.)
const base = { shift: DEFAULT_SHIFT, holidays: new Set<string>(), today: '2026-11-30', otBlockMinutes: 30 };

describe('nextPunchType', () => {
  it('starts with IN and alternates', () => {
    const now = t('2026-11-02T12:00');
    expect(nextPunchType(null, now)).toBe('IN');
    expect(nextPunchType(p('IN', '2026-11-02T09:00'), now)).toBe('OUT');
    expect(nextPunchType(p('OUT', '2026-11-02T11:00'), now)).toBe('IN');
  });
  it('treats a very old IN as a forgotten clock-out', () => {
    expect(nextPunchType(p('IN', '2026-11-01T09:00'), t('2026-11-02T09:00'))).toBe('IN');
  });
});

describe('buildSessions', () => {
  it('pairs IN/OUT and ignores orphan OUT', () => {
    const s = buildSessions([p('OUT', '2026-11-02T08:00'), p('IN', '2026-11-02T09:00'), p('OUT', '2026-11-02T18:00')]);
    expect(s).toHaveLength(1);
    expect(s[0].out).toEqual(t('2026-11-02T18:00'));
  });
});

describe('summarizeDays', () => {
  it('normal day, no late, no OT', () => {
    const [d] = summarizeDays({ ...base, punches: [p('IN', '2026-11-02T08:58'), p('OUT', '2026-11-02T18:10')], startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(d.status).toBe('PRESENT');
    expect(d.lateMinutes).toBe(0);
    expect(d.otMinutes).toBe(0);
    expect(d.regularMinutes).toBe(480);
  });
  it('late beyond grace period and OT rounded to 30 min', () => {
    const [d] = summarizeDays({ ...base, punches: [p('IN', '2026-11-02T09:20'), p('OUT', '2026-11-02T19:45')], startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(d.lateMinutes).toBe(20);
    expect(d.otMinutes).toBe(90);
    expect(d.regularMinutes).toBe(480 - 20 + 15); // ทำงานจริงหลังหักพัก แล้วหัก OT ออก (ไม่เกิน 8 ชม.)
  });
  it('late within grace is not counted', () => {
    const [d] = summarizeDays({ ...base, punches: [p('IN', '2026-11-02T09:05'), p('OUT', '2026-11-02T18:00')], startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(d.lateMinutes).toBe(0);
  });
  it('absent on past scheduled day, off on Sunday, pending today', () => {
    const days = summarizeDays({ ...base, today: '2026-11-03', punches: [], startDate: '2026-11-01', endDate: '2026-11-03' });
    expect(days.map((d) => d.status)).toEqual(['OFF', 'ABSENT', 'PENDING']);
  });
  it('work on a public holiday goes to holiday minutes', () => {
    const [d] = summarizeDays({ ...base, holidays: new Set(['2026-11-02']), punches: [p('IN', '2026-11-02T09:00'), p('OUT', '2026-11-02T20:00')], startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(d.scheduled).toBe(false);
    expect(d.regularMinutes).toBe(480);
    expect(d.otMinutes).toBe(120);
  });
  it('missing clock-out is INCOMPLETE', () => {
    const [d] = summarizeDays({ ...base, punches: [p('IN', '2026-11-02T09:00')], startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(d.status).toBe('INCOMPLETE');
    expect(d.workedMinutes).toBe(0);
  });
  it('overnight shift counts to the IN date', () => {
    const night = { ...DEFAULT_SHIFT, startTime: '22:00', endTime: '06:00' };
    const [d] = summarizeDays({ ...base, shift: night, punches: [p('IN', '2026-11-02T22:00'), p('OUT', '2026-11-03T06:00')], startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(d.status).toBe('PRESENT');
    expect(d.regularMinutes).toBe(420);
  });
});

describe('employedFrom', () => {
  it('does not count absence before the start date', () => {
    const days = summarizeDays({ ...base, employedFrom: '2026-11-03', punches: [], startDate: '2026-11-02', endDate: '2026-11-04' });
    expect(days.map((d) => d.status)).toEqual(['OFF', 'ABSENT', 'ABSENT']);
  });
  it('ignores punches before the start date', () => {
    const [d] = summarizeDays({ ...base, employedFrom: '2026-11-03', punches: [p('IN', '2026-11-02T09:00'), p('OUT', '2026-11-02T18:00')], startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(d.workedMinutes).toBe(0);
  });
});
