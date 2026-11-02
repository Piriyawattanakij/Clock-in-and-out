export type Motif = 'wave' | 'rays' | 'asanoha' | 'sakura' | 'fuji' | 'dots';
/** 0 = ไม่มีระดับ, 1 = Tamago, 2 = Salmon, 3 = Otoro */
export type Tier = 0 | 1 | 2 | 3;
export type AchievementGroup = 'monthly' | 'streak' | 'milestone' | 'fun' | 'manual';

export interface AchievementDef {
  key: string;
  name: string;
  /** เงื่อนไขที่แสดงให้พนักงานเห็น */
  description: string;
  kanji: string;
  kanjiMeaning: string;
  motif: Motif;
  colors: [string, string];
  tier: Tier;
  group: AchievementGroup;
  /** เงินรางวัลเริ่มต้น (บาท) — ผู้ดูแลแก้ได้ */
  defaultAmount: number;
  /** ได้ซ้ำได้ (เช่นทุกเดือน) */
  repeatable: boolean;
  kind: 'AUTO' | 'MANUAL';
  /** ใช้แสดงความคืบหน้า เช่น streak */
  target?: number;
}

export const TIER_INFO: Record<Exclude<Tier, 0>, { name: string; emoji: string; ring: [string, string] }> = {
  1: { name: 'Tamago', emoji: '🥚', ring: ['#ffe08a', '#d49a1c'] },
  2: { name: 'Salmon', emoji: '🍣', ring: ['#ffb59c', '#e0603e'] },
  3: { name: 'Otoro', emoji: '👑', ring: ['#fff1b8', '#b8860b'] },
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- รายเดือน (ได้เงิน) ----
  { key: 'perfect_month', name: 'ขยันเต็มเดือน', description: 'ไม่ขาด ไม่สาย ไม่ลากิจ/ลาไม่รับเงินทั้งเดือน (ลาป่วยได้ไม่เกินที่กำหนด)', kanji: '勤', kanjiMeaning: 'ขยัน', motif: 'wave', colors: ['#2f4b8a', '#152650'], tier: 0, group: 'monthly', defaultAmount: 500, repeatable: true, kind: 'AUTO' },
  { key: 'punctual_month', name: 'ตรงเวลาทั้งเดือน', description: 'ไม่สายเลยสักวันในเดือน (มาทำงานอย่างน้อยครึ่งหนึ่งของวันทำงาน)', kanji: '時', kanjiMeaning: 'เวลา', motif: 'rays', colors: ['#d64933', '#8e2316'], tier: 0, group: 'monthly', defaultAmount: 200, repeatable: true, kind: 'AUTO' },
  { key: 'hero_shift', name: 'ฮีโร่แทนกะ', description: 'มาช่วยงานในวันหยุดของตัวเอง 2 ครั้งขึ้นไปในเดือน', kanji: '援', kanjiMeaning: 'ช่วยเหลือ', motif: 'asanoha', colors: ['#5f8a4f', '#2f4d26'], tier: 0, group: 'monthly', defaultAmount: 300, repeatable: true, kind: 'AUTO' },
  // ---- streak ----
  { key: 'streak_punctual_30', name: 'ตรงเวลาติดกัน 30 วัน', description: 'มาตรงเวลาติดต่อกัน 30 วันทำงาน (วันลาไม่ตัด streak)', kanji: '連', kanjiMeaning: 'ต่อเนื่อง', motif: 'rays', colors: ['#c98a2b', '#7a4c0c'], tier: 1, group: 'streak', defaultAmount: 0, repeatable: false, kind: 'AUTO', target: 30 },
  { key: 'streak_punctual_100', name: 'ตรงเวลาติดกัน 100 วัน', description: 'มาตรงเวลาติดต่อกัน 100 วันทำงาน', kanji: '連', kanjiMeaning: 'ต่อเนื่อง', motif: 'rays', colors: ['#c98a2b', '#7a4c0c'], tier: 2, group: 'streak', defaultAmount: 0, repeatable: false, kind: 'AUTO', target: 100 },
  { key: 'streak_punctual_250', name: 'ตรงเวลาติดกัน 250 วัน', description: 'มาตรงเวลาติดต่อกัน 250 วันทำงาน', kanji: '連', kanjiMeaning: 'ต่อเนื่อง', motif: 'rays', colors: ['#c98a2b', '#7a4c0c'], tier: 3, group: 'streak', defaultAmount: 0, repeatable: false, kind: 'AUTO', target: 250 },
  { key: 'streak_perfect_3', name: 'ขยันติดกัน 3 เดือน', description: 'ได้ “ขยันเต็มเดือน” ติดต่อกัน 3 เดือน', kanji: '極', kanjiMeaning: 'สุดยอด', motif: 'wave', colors: ['#7a4fa0', '#3f2260'], tier: 1, group: 'streak', defaultAmount: 300, repeatable: false, kind: 'AUTO', target: 3 },
  { key: 'streak_perfect_6', name: 'ขยันติดกัน 6 เดือน', description: 'ได้ “ขยันเต็มเดือน” ติดต่อกัน 6 เดือน', kanji: '極', kanjiMeaning: 'สุดยอด', motif: 'wave', colors: ['#7a4fa0', '#3f2260'], tier: 2, group: 'streak', defaultAmount: 800, repeatable: false, kind: 'AUTO', target: 6 },
  { key: 'streak_perfect_12', name: 'ขยันติดกัน 12 เดือน', description: 'ได้ “ขยันเต็มเดือน” ติดต่อกัน 12 เดือน', kanji: '極', kanjiMeaning: 'สุดยอด', motif: 'wave', colors: ['#7a4fa0', '#3f2260'], tier: 3, group: 'streak', defaultAmount: 2000, repeatable: false, kind: 'AUTO', target: 12 },
  // ---- milestone ----
  { key: 'probation', name: 'ผ่านทดลองงาน', description: 'ทำงานครบ 119 วัน', kanji: '合', kanjiMeaning: 'ผ่าน', motif: 'fuji', colors: ['#4d8fc0', '#24577e'], tier: 0, group: 'milestone', defaultAmount: 0, repeatable: false, kind: 'AUTO' },
  { key: 'tenure_1', name: 'ครบรอบ 1 ปี', description: 'ทำงานกับร้านครบ 1 ปี', kanji: '祝', kanjiMeaning: 'ฉลอง', motif: 'sakura', colors: ['#e98aa6', '#a8445f'], tier: 1, group: 'milestone', defaultAmount: 1000, repeatable: false, kind: 'AUTO' },
  { key: 'tenure_3', name: 'ครบรอบ 3 ปี', description: 'ทำงานกับร้านครบ 3 ปี', kanji: '祝', kanjiMeaning: 'ฉลอง', motif: 'sakura', colors: ['#e98aa6', '#a8445f'], tier: 2, group: 'milestone', defaultAmount: 3000, repeatable: false, kind: 'AUTO' },
  { key: 'tenure_5', name: 'ครบรอบ 5 ปี', description: 'ทำงานกับร้านครบ 5 ปี', kanji: '祝', kanjiMeaning: 'ฉลอง', motif: 'sakura', colors: ['#e98aa6', '#a8445f'], tier: 3, group: 'milestone', defaultAmount: 5000, repeatable: false, kind: 'AUTO' },
  // ---- สนุก ๆ (badge อย่างเดียว) ----
  { key: 'early_bird', name: 'นกตื่นเช้า', description: 'บันทึกเข้าก่อนเวลา 10 นาทีขึ้นไป 15 วันในเดือน', kanji: '早', kanjiMeaning: 'เช้า', motif: 'fuji', colors: ['#f0a04b', '#b45e12'], tier: 0, group: 'fun', defaultAmount: 0, repeatable: true, kind: 'AUTO' },
  { key: 'never_forget', name: 'ไม่เคยลืม', description: 'ไม่ลืมบันทึกออกเลยทั้งเดือน (มาทำงาน 10 วันขึ้นไป)', kanji: '完', kanjiMeaning: 'สมบูรณ์', motif: 'dots', colors: ['#3f9c96', '#1d5552'], tier: 0, group: 'fun', defaultAmount: 0, repeatable: true, kind: 'AUTO' },
  { key: 'quick_confirm', name: 'ยืนยันไว', description: 'ยืนยันวันทำงานภายในวันแรกที่เปิดให้ยืนยัน', kanji: '速', kanjiMeaning: 'รวดเร็ว', motif: 'rays', colors: ['#4a6fd1', '#233d86'], tier: 0, group: 'fun', defaultAmount: 0, repeatable: true, kind: 'AUTO' },
  { key: 'news_reader', name: 'ติดตามข่าว', description: 'อ่านประกาศทุกฉบับในเดือนภายใน 24 ชั่วโมง', kanji: '報', kanjiMeaning: 'ข่าวสาร', motif: 'asanoha', colors: ['#8a6d4b', '#4e3a22'], tier: 0, group: 'fun', defaultAmount: 0, repeatable: true, kind: 'AUTO' },
  // ---- ผู้ดูแลมอบให้ ----
  { key: 'employee_of_month', name: 'พนักงานยอดเยี่ยม', description: 'ผู้ดูแลมอบให้พนักงานยอดเยี่ยมประจำเดือน', kanji: '星', kanjiMeaning: 'ดาว', motif: 'rays', colors: ['#caa13a', '#7d5c0c'], tier: 0, group: 'manual', defaultAmount: 500, repeatable: true, kind: 'MANUAL' },
  { key: 'customer_praise', name: 'ลูกค้าชม', description: 'ลูกค้าเอ่ยชื่อชมในรีวิวหรือที่ร้าน', kanji: '客', kanjiMeaning: 'ลูกค้า', motif: 'sakura', colors: ['#e36f8f', '#962f4f'], tier: 0, group: 'manual', defaultAmount: 200, repeatable: true, kind: 'MANUAL' },
  { key: 'sushi_master', name: 'Sushi Master', description: 'ผ่านการฝึกทักษะใหม่', kanji: '匠', kanjiMeaning: 'ช่างฝีมือ', motif: 'wave', colors: ['#3a3a3a', '#0e0e0e'], tier: 0, group: 'manual', defaultAmount: 1000, repeatable: true, kind: 'MANUAL' },
];

export const ACHIEVEMENT_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

export const GROUP_LABEL: Record<AchievementGroup, string> = {
  monthly: 'รายเดือน',
  streak: 'ต่อเนื่อง',
  milestone: 'เหตุการณ์สำคัญ',
  fun: 'สนุก ๆ',
  manual: 'พิเศษจากร้าน',
};
