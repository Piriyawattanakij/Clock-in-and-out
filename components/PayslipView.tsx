import type { Employee, Payslip, PayrollPeriod } from '@prisma/client';
import { fmtBaht } from '@/lib/money';
import { PAY_TYPE_LABEL, type PayType } from '@/lib/payroll';
import { fmtDate, fmtMinutes } from '@/lib/time';
import { BrandLogo } from './BrandLogo';

export function PayslipView({ slip }: { slip: Payslip & { employee: Employee; period: PayrollPeriod } }) {
  const income: [string, number][] = [
    ['ค่าจ้างปกติ', slip.basePay],
    ['ค่าทำงานวันหยุด', slip.holidayPay],
    ['ค่าล่วงเวลา (OT)', slip.otPay],
    ['เบี้ยเลี้ยง', slip.allowance],
    ['โบนัส / อื่น ๆ', slip.bonus],
  ];
  const deduct: [string, number][] = [
    ['หักมาสาย', slip.lateDeduction],
    ['หักขาดงาน / ลาไม่รับเงิน', slip.absentDeduction],
    ['ประกันสังคม', slip.socialSecurity],
    ['ภาษีหัก ณ ที่จ่าย', slip.withholdingTax],
    ['หักอื่น ๆ', slip.otherDeduction],
  ];
  const deductTotal = deduct.reduce((a, [, v]) => a + v, 0) - slip.lateDeduction - slip.absentDeduction;

  return (
    <>
    <div className="hero net-hero">
      <div className="muted">รับสุทธิ · {slip.period.name}</div>
      <div className="amount">฿{fmtBaht(slip.netPay)}</div>
      <div className="muted">{fmtDate(slip.period.startDate)} – {fmtDate(slip.period.endDate)}</div>
    </div>
    <div className="card slip">
      <div className="row">
        <div>
          <h2 style={{ margin: 0 }}>สลิปเงินเดือน — {slip.period.name}</h2>
          <div className="muted">
            {fmtDate(slip.period.startDate)} – {fmtDate(slip.period.endDate)}
          </div>
        </div>
        <span className="spacer" />
        <BrandLogo height={48} />
      </div>
      <div className="grid grid-2" style={{ margin: '16px 0' }}>
        <div className="stat"><span className="muted">พนักงาน</span><b>{slip.employee.name}</b><span className="muted">{slip.employee.code} {slip.employee.position ?? ''}</span></div>
        <div className="stat"><span className="muted">ประเภทค่าจ้าง</span><b>{PAY_TYPE_LABEL[slip.payType as PayType]}</b><span className="muted">{fmtBaht(slip.baseSalary)} บาท</span></div>
        <div className="stat"><span className="muted">วันทำงาน / ลา / ขาด</span><b>{slip.workDays} / {slip.leaveDays + slip.unpaidLeaveDays} / {slip.absentDays} วัน</b>{slip.unpaidLeaveDays > 0 && <span className="muted">ลาไม่รับเงิน {slip.unpaidLeaveDays} วัน</span>}</div>
        <div className="stat"><span className="muted">สาย / OT</span><b>{fmtMinutes(slip.lateMinutes)} / {fmtMinutes(slip.otMinutes + slip.holidayOtMinutes)}</b></div>
      </div>
      <div className="grid">
        <table>
          <thead><tr><th>รายได้</th><th className="num">บาท</th></tr></thead>
          <tbody>
            {income.map(([k, v]) => (
              <tr key={k}><td>{k}</td><td className="num">{fmtBaht(v)}</td></tr>
            ))}
            {deduct.slice(0, 2).map(([k, v]) => (
              <tr key={k}><td>{k}</td><td className="num">−{fmtBaht(v)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><th>รวมรายได้</th><th className="num">{fmtBaht(slip.grossPay)}</th></tr></tfoot>
        </table>
        <table>
          <thead><tr><th>รายการหัก</th><th className="num">บาท</th></tr></thead>
          <tbody>
            {deduct.slice(2).map(([k, v]) => (
              <tr key={k}><td>{k}</td><td className="num">{fmtBaht(v)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr><th>รวมรายการหัก</th><th className="num">{fmtBaht(deductTotal)}</th></tr></tfoot>
        </table>
      </div>
      <div className="row" style={{ marginTop: 16, fontSize: 20 }}>
        <b>รับสุทธิ</b>
        <span className="spacer" />
        <b>{fmtBaht(slip.netPay)} บาท</b>
      </div>
      {slip.note && <p className="muted">หมายเหตุ: {slip.note}</p>}
    </div>
    </>
  );
}
