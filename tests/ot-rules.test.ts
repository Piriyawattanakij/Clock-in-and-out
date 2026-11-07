import { describe, expect, it } from 'vitest';
import { summarizeDays, type Punch, type ShiftDef } from '@/lib/attendance';

// กะ 10:00–19:00 พัก 60 นาที → ชั่วโมงปกติ 8 ชม. · 2026-11-02 = จันทร์ (วันทำงาน), 2026-11-01 = อาทิตย์ (วันหยุด)
const shift: ShiftDef = { startTime: '10:00', endTime: '19:00', breakMinutes: 60, lateGraceMinutes: 5, workDays: [1, 2, 3, 4, 5, 6] };
const t = (s: string) => new Date(`${s}:00+07:00`);
const day = (inAt: string, outAt: string, date = '2026-11-02', grace = 15) =>
  summarizeDays({
    punches: [{ type: 'IN', timestamp: t(`${date}T${inAt}`) }, { type: 'OUT', timestamp: t(`${date}T${outAt}`) }] as Punch[],
    shift, holidays: new Set(), startDate: date, endDate: date, today: '2026-11-30', otBlockMinutes: 30, otGraceMinutes: grace,
  })[0];

describe('OT counts only after the shift ends; arriving early never counts', () => {
  it('early arrival, leaves on time → no OT, 8 h regular', () => {
    const d = day('08:30', '19:00');
    expect(d.otMinutes).toBe(0);
    expect(d.regularMinutes).toBe(480);
    expect(d.workedMinutes).toBe(570); // เวลาอยู่ร้านจริงยังแสดงครบ
  });
  it('on time, leaves 1 h 10 min late → 1 h OT (rounded down to 30 min)', () => {
    expect(day('10:00', '20:10').otMinutes).toBe(60);
  });
  it('early and late → OT only after 19:00', () => {
    const d = day('08:30', '20:10');
    expect(d.otMinutes).toBe(60);
    expect(d.regularMinutes).toBe(480);
  });
  it('leaving up to the grace period late is not OT; beyond it counts from the shift end', () => {
    expect(day('10:00', '19:15').otMinutes).toBe(0);
    expect(day('10:00', '19:40').otMinutes).toBe(30);
  });
  it('day off: early arrival is not counted either', () => {
    const d = day('08:30', '19:00', '2026-11-01');
    expect(d.scheduled).toBe(false);
    expect(d.regularMinutes).toBe(480);
    expect(d.otMinutes).toBe(0);
  });
  it('day off: time after the shift end is holiday OT', () => {
    const d = day('10:00', '21:00', '2026-11-01');
    expect(d.regularMinutes).toBe(480);
    expect(d.otMinutes).toBe(120);
  });
  it('arriving late shortens regular hours and is still marked late', () => {
    const d = day('11:00', '19:00');
    expect(d.lateMinutes).toBe(60);
    expect(d.regularMinutes).toBe(420);
  });
});
