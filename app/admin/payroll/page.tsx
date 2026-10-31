import Link from 'next/link';
import { prisma } from '@/lib/db';
import { createPeriodAction } from '@/app/admin/actions';
import { fmtBaht } from '@/lib/money';
import { fmtDate, toDateStr } from '@/lib/time';
import { Flash } from '@/components/Flash';
import { PeriodStatus } from './PeriodStatus';

export const dynamic = 'force-dynamic';

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const periods = await prisma.payrollPeriod.findMany({ include: { payslips: true }, orderBy: { startDate: 'desc' } });
  const thisMonth = toDateStr(new Date()).slice(0, 7);

  return (
    <main className="container">
      <h1>เงินเดือน</h1>
      <Flash {...sp} />
      <div className="grid">
        <form action={createPeriodAction} className="card">
          <h2 style={{ marginTop: 0 }}>สร้างงวดรายเดือน</h2>
          <label>เดือน<input type="month" name="month" defaultValue={thisMonth} required /></label>
          <button className="btn btn-primary" style={{ marginTop: 12 }}>สร้างและคำนวณ</button>
        </form>
        <form action={createPeriodAction} className="card">
          <h2 style={{ marginTop: 0 }}>สร้างงวดกำหนดเอง</h2>
          <p className="muted" style={{ marginTop: 0 }}>เช่น จ่ายทุก 15 วัน</p>
          <div className="row">
            <input type="date" name="startDate" required style={{ width: 'auto' }} />
            <span>ถึง</span>
            <input type="date" name="endDate" required style={{ width: 'auto' }} />
          </div>
          <input name="name" placeholder="ชื่องวด (ไม่บังคับ)" style={{ marginTop: 8 }} />
          <button className="btn btn-primary" style={{ marginTop: 12 }}>สร้างและคำนวณ</button>
        </form>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>งวด</th><th>ช่วงวันที่</th><th>สถานะ</th><th className="num">พนักงาน</th><th className="num">ยอดจ่ายสุทธิ (บาท)</th></tr>
          </thead>
          <tbody>
            {periods.length === 0 && <tr><td colSpan={5} className="muted">ยังไม่มีงวดเงินเดือน</td></tr>}
            {periods.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/payroll/${p.id}`}>{p.name}</Link></td>
                <td>{fmtDate(p.startDate)} – {fmtDate(p.endDate)}</td>
                <td><PeriodStatus status={p.status} /></td>
                <td className="num">{p.payslips.length}</td>
                <td className="num">{fmtBaht(p.payslips.reduce((a, s) => a + s.netPay, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
