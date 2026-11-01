import { prisma } from './db';
import { DEFAULT_PAYROLL_SETTINGS, type PayrollSettings } from './payroll';

export interface AppSettings extends PayrollSettings {
  /** GPS ต้องแม่นยำกว่านี้ (เมตร) จึงจะยอมให้บันทึกเวลา */
  maxAccuracyM: number;
  /** ปัด OT ลงเป็นช่วงละกี่นาที */
  otBlockMinutes: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ...DEFAULT_PAYROLL_SETTINGS,
  maxAccuracyM: 100,
  otBlockMinutes: 30,
};

const KEY = 'app';

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: AppSettings) {
  const value = JSON.stringify(s);
  await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
}
