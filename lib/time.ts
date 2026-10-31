// ประเทศไทยใช้ UTC+7 ตลอดปี (ไม่มี daylight saving) จึงคำนวณแบบ offset คงที่ได้
export const TZ = 'Asia/Bangkok';
const OFFSET_MS = 7 * 3600_000;

/** วันที่ (YYYY-MM-DD) ตามเวลาไทย */
export function toDateStr(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** แปลง "YYYY-MM-DD" + "HH:MM" (เวลาไทย) เป็น Date */
export function atTime(dateStr: string, hhmm: string): Date {
  return new Date(`${dateStr}T${hhmm}:00+07:00`);
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = อาทิตย์ ... 6 = เสาร์ */
export function weekday(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function daysInclusive(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400_000) + 1;
}

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}` };
}

/** งวดครอบคลุมทั้งเดือนปฏิทินพอดีหรือไม่ */
export function isFullMonth(start: string, end: string): boolean {
  const r = monthRange(start.slice(0, 7));
  return r.start === start && r.end === end;
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function fmtTime(d: Date | null | undefined): string {
  if (!d) return '-';
  return d.toLocaleTimeString('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(`${d}T12:00:00+07:00`) : d;
  return date.toLocaleDateString('th-TH', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d: Date): string {
  return `${fmtDate(d)} ${fmtTime(d)}`;
}

export function fmtMinutes(m: number): string {
  if (!m) return '-';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? (mm ? `${h} ชม. ${mm} น.` : `${h} ชม.`) : `${mm} น.`;
}

/** สำหรับ <input type="datetime-local"> ตามเวลาไทย */
export function toLocalInput(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

export function fromLocalInput(v: string): Date {
  return new Date(`${v}:00+07:00`);
}
