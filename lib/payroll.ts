import type { DaySummary } from './attendance';

export type PayType = 'MONTHLY' | 'DAILY' | 'HOURLY';

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  MONTHLY: 'รายเดือน',
  DAILY: 'รายวัน',
  HOURLY: 'รายชั่วโมง',
};

/** ค่าตั้งค่าการคำนวณ (หน่วยเงินเป็น "บาท" เพื่อให้แก้ในหน้าตั้งค่าได้ง่าย) */
export interface PayrollSettings {
  hoursPerDay: number;
  daysPerMonth: number;
  otMultiplier: number;
  holidayOtMultiplier: number;
  /** ทำงานในวันหยุด: ลูกจ้างรายเดือนได้เพิ่มอีกกี่เท่า (เพราะได้เงินเดือนของวันหยุดแล้ว) */
  holidayWorkMultiplierMonthly: number;
  /** ทำงานในวันหยุด: ลูกจ้างรายวัน/รายชั่วโมง */
  holidayWorkMultiplierOther: number;
  deductLate: boolean;
  ssoRatePercent: number;
  ssoWageMin: number;
  ssoWageCap: number;
  personalAllowance: number;
  expenseRatePercent: number;
  expenseCap: number;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
  hoursPerDay: 8,
  daysPerMonth: 30,
  otMultiplier: 1.5,
  holidayOtMultiplier: 3,
  holidayWorkMultiplierMonthly: 1,
  holidayWorkMultiplierOther: 2,
  deductLate: true,
  ssoRatePercent: 5,
  ssoWageMin: 1650,
  ssoWageCap: 15000, // ตรวจสอบเพดานค่าจ้างล่าสุดกับสำนักงานประกันสังคม แล้วแก้ได้ในหน้าตั้งค่า
  personalAllowance: 60000,
  expenseRatePercent: 50,
  expenseCap: 100000,
};

/** อัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได (บาท) */
const TAX_BRACKETS: [number, number][] = [
  [150_000, 0],
  [300_000, 0.05],
  [500_000, 0.1],
  [750_000, 0.15],
  [1_000_000, 0.2],
  [2_000_000, 0.25],
  [5_000_000, 0.3],
  [Infinity, 0.35],
];

export function progressiveTax(netIncome: number): number {
  let tax = 0;
  let prev = 0;
  for (const [limit, rate] of TAX_BRACKETS) {
    if (netIncome <= prev) break;
    tax += (Math.min(netIncome, limit) - prev) * rate;
    prev = limit;
  }
  return tax;
}

/** ภาษีทั้งปี (บาท) จากรายได้ทั้งปี */
export function annualTax(annualIncome: number, annualSso: number, extraDeduction: number, s: PayrollSettings): number {
  const expense = Math.min(annualIncome * (s.expenseRatePercent / 100), s.expenseCap);
  const net = annualIncome - expense - s.personalAllowance - annualSso - extraDeduction;
  return progressiveTax(Math.max(0, net));
}

export interface PayslipInput {
  payType: PayType;
  baseSalary: number; // สตางค์
  allowance: number; // สตางค์/เดือน
  bonus: number;
  /** แลกเงินรางวัลสะสม (เงินได้ครั้งคราว ไม่คิดประกันสังคม และคิดภาษีแยกไม่คูณ 12) */
  rewardPay?: number;
  otherDeduction: number;
  socialSecurity: boolean;
  taxDeduction: number; // สตางค์/ปี
  days: DaySummary[];
  periodDays: number;
  fullMonth: boolean;
}

export interface PayslipResult {
  workDays: number;
  absentDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  workMinutes: number;
  lateMinutes: number;
  otMinutes: number;
  holidayWorkMinutes: number;
  holidayOtMinutes: number;
  basePay: number;
  holidayPay: number;
  otPay: number;
  allowance: number;
  bonus: number;
  rewardPay: number;
  lateDeduction: number;
  absentDeduction: number;
  socialSecurity: number;
  withholdingTax: number;
  otherDeduction: number;
  grossPay: number;
  netPay: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** คำนวณสลิปเงินเดือน 1 งวด — ผลลัพธ์เป็นสตางค์ */
export function calcPayslip(input: PayslipInput, s: PayrollSettings = DEFAULT_PAYROLL_SETTINGS): PayslipResult {
  const { payType, baseSalary, days } = input;
  const sched = days.filter((d) => d.scheduled);
  const offWork = days.filter((d) => !d.scheduled && d.workedMinutes > 0);

  const workDays = sched.filter((d) => d.status === 'PRESENT' || d.status === 'INCOMPLETE').length;
  const absentDays = sched.filter((d) => d.status === 'ABSENT').length;
  const leaveDays = sched.filter((d) => d.status === 'LEAVE' && d.leave?.paid).length;
  const unpaidLeaveDays = sched.filter((d) => d.status === 'LEAVE' && !d.leave?.paid).length;
  const workMinutes = sum(sched.map((d) => d.regularMinutes));
  const lateMinutes = sum(sched.map((d) => d.lateMinutes));
  const otMinutes = sum(sched.map((d) => d.otMinutes));
  const holidayWorkMinutes = sum(offWork.map((d) => d.regularMinutes));
  const holidayOtMinutes = sum(offWork.map((d) => d.otMinutes));

  let daily: number;
  let hourly: number;
  if (payType === 'MONTHLY') {
    daily = baseSalary / s.daysPerMonth;
    hourly = daily / s.hoursPerDay;
  } else if (payType === 'DAILY') {
    daily = baseSalary;
    hourly = baseSalary / s.hoursPerDay;
  } else {
    hourly = baseSalary;
    daily = baseSalary * s.hoursPerDay;
  }

  const prorate = input.fullMonth ? 1 : input.periodDays / s.daysPerMonth;
  const r = Math.round;

  const basePay = r(
    payType === 'MONTHLY'
      ? baseSalary * prorate
      : payType === 'DAILY'
        ? (workDays + leaveDays) * daily // ลาแบบได้รับเงิน = ได้ค่าแรงเต็มวัน
        : (workMinutes / 60 + leaveDays * s.hoursPerDay) * hourly,
  );
  const holidayPay = r((holidayWorkMinutes / 60) * hourly * (payType === 'MONTHLY' ? s.holidayWorkMultiplierMonthly : s.holidayWorkMultiplierOther));
  const otPay = r((otMinutes / 60) * hourly * s.otMultiplier + (holidayOtMinutes / 60) * hourly * s.holidayOtMultiplier);
  const allowance = r(input.allowance * prorate);
  // รายชั่วโมงคิดตามเวลาจริงอยู่แล้ว จึงไม่หักสายซ้ำ
  const lateDeduction = s.deductLate && payType !== 'HOURLY' ? r((lateMinutes / 60) * hourly) : 0;
  // รายวัน/รายชั่วโมง วันที่ขาดก็ไม่ได้ค่าแรงอยู่แล้ว
  // รายเดือน: หักวันขาดงาน + วันลาไม่รับเงิน
  const absentDeduction = payType === 'MONTHLY' ? r((absentDays + unpaidLeaveDays) * daily) : 0;

  const regularPay = Math.max(0, basePay + holidayPay + otPay + allowance + input.bonus - lateDeduction - absentDeduction);
  const rewardPay = Math.max(0, input.rewardPay ?? 0);
  const grossPay = regularPay + rewardPay;

  const ssoWage = Math.min(Math.max(regularPay, s.ssoWageMin * 100 * prorate), s.ssoWageCap * 100 * prorate);
  const socialSecurity = input.socialSecurity && regularPay > 0 ? r(ssoWage * (s.ssoRatePercent / 100)) : 0;

  // ภาษีหัก ณ ที่จ่าย: ประมาณรายได้ทั้งปีจากงวดนี้ แล้วเฉลี่ยกลับมาเป็นต่องวด
  const periodsPerYear = input.fullMonth ? 12 : 365 / input.periodDays;
  const annualRegular = (regularPay / 100) * periodsPerYear;
  const annualSso = (socialSecurity / 100) * periodsPerYear;
  const taxYear = annualTax(annualRegular, annualSso, input.taxDeduction / 100, s);
  // เงินได้ครั้งคราว (แลกรางวัล): ภาษีส่วนเพิ่ม = ภาษีทั้งปีเมื่อรวมเงินก้อน − ภาษีทั้งปีเมื่อไม่รวม
  const rewardTax = rewardPay > 0 ? annualTax(annualRegular + rewardPay / 100, annualSso, input.taxDeduction / 100, s) - taxYear : 0;
  const withholdingTax = r((taxYear / periodsPerYear + rewardTax) * 100);

  const netPay = grossPay - socialSecurity - withholdingTax - input.otherDeduction;

  return {
    workDays,
    absentDays,
    leaveDays,
    unpaidLeaveDays,
    workMinutes,
    lateMinutes,
    otMinutes,
    holidayWorkMinutes,
    holidayOtMinutes,
    basePay,
    holidayPay,
    otPay,
    allowance,
    bonus: input.bonus,
    rewardPay,
    lateDeduction,
    absentDeduction,
    socialSecurity,
    withholdingTax,
    otherDeduction: input.otherDeduction,
    grossPay,
    netPay,
  };
}
