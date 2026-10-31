import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { computePeriodAction, deletePeriodAction, setPeriodStatusAction, updatePayslipAction } from '@/app/admin/actions';
import { fmtBaht, toBahtInput } from '@/lib/money';
import { fmtDate, fmtDateTime, fmtMinutes } from '@/lib/time';
import { Flash } from '@/components/Flash';
import { PeriodStatus } from '../PeriodStatus';

export const dynamic = 'force-dynamic';

function StatusButton({ periodId, to, label, primary }: { periodId: number; to: string; label: string; primary?: boolean }) {
  return (
    <form action={setPeriodStatusAction}>
      <input type="hidden" name="periodId" value={periodId} />
      <input type="hidden" name="to" value={to} />
      <button className={`btn ${primary ? 'btn-primary' : ''}`}>{label}</button>
    </form>
  );
}

export default async function PeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const period = Number.isInteger(id)
    ? await prisma.payrollPeriod.findUnique({
        where: { id },
        include: { payslips: { include: { employee: true }, orderBy: { employee: { code: 'asc' } } } },
      })
    : null;
  if (!period) notFound();
  const draft = period.status === 'DRAFT';
  const total = (k: 'grossPay' | 'socialSecurity' | 'withholdingTax' | 'netPay') => period.payslips.reduce((a, s) => a + s[k], 0);

  return (
    <main className="container">
      <Link href="/admin/payroll">← งวดทั้งหมด</Link>
      <div className="row">
        <h1>{period.name}</h1>
        <PeriodStatus status={period.status} />
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        {fmtDate(period.startDate)} – {fmtDate(period.endDate)}
        {period.computedAt && ` · คำนวณล่าสุด ${fmtDateTime(period.computedAt)}`}
      </p>
      <Flash {...sp} />

      <div className="row card">
        {draft && (
          <>
            <form action={computePeriodAction}>
              <input type="hidden" name="periodId" value={period.id} />
              <button className="btn">🔄 คำนวณใหม่</button>
            </form>
            <StatusButton periodId={period.id} to="APPROVED" label="✔ อนุมัติ (พนักงานจะเห็นสลิป)" primary />
          </>
        )}
        {period.status === 'APPROVED' && (
          <>
            <StatusButton periodId={period.id} to="DRAFT" label="↩ กลับเป็นร่าง" />
            <StatusButton periodId={period.id} to="PAID" label="💰 บันทึกว่าจ่ายแล้ว (ล็อกงวด)" primary />
          </>
        )}
        <span className="spacer" />
        <a className="btn" href={`/admin/payroll/${period.id}/export`}>⬇ Export CSV (Excel)</a>
        {draft && (
          <form action={deletePeriodAction}>
            <input type="hidden" name="periodId" value={period.id} />
            <button className="btn btn-danger">ลบงวด</button>
          </form>
        )}
      </div>

      <div className="grid">
        <div className="card stat"><span className="muted">รวมรายได้</span><b>{fmtBaht(total('grossPay'))}</b></div>
        <div className="card stat"><span className="muted">ประกันสังคม</span><b>{fmtBaht(total('socialSecurity'))}</b></div>
        <div className="card stat"><span className="muted">ภาษีหัก ณ ที่จ่าย</span><b>{fmtBaht(total('withholdingTax'))}</b></div>
        <div className="card stat"><span className="muted">ยอดจ่ายสุทธิ</span><b>{fmtBaht(total('netPay'))}</b></div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>พนักงาน</th><th className="num">วันทำงาน</th><th className="num">ขาด</th><th className="num">สาย</th><th className="num">OT</th>
              <th className="num">ค่าจ้าง</th><th className="num">OT/วันหยุด</th><th className="num">หักสาย/ขาด</th>
              <th className="num">ประกันสังคม</th><th className="num">ภาษี</th><th className="num">สุทธิ</th><th></th>
            </tr>
          </thead>
          <tbody>
            {period.payslips.map((s) => (
              <tr key={s.id}>
                <td>{s.employee.code} {s.employee.name}</td>
                <td className="num">{s.workDays}</td>
                <td className="num">{s.absentDays || '-'}</td>
                <td className="num">{fmtMinutes(s.lateMinutes)}</td>
                <td className="num">{fmtMinutes(s.otMinutes + s.holidayOtMinutes)}</td>
                <td className="num">{fmtBaht(s.basePay)}</td>
                <td className="num">{fmtBaht(s.otPay + s.holidayPay)}</td>
                <td className="num">{fmtBaht(s.lateDeduction + s.absentDeduction)}</td>
                <td className="num">{fmtBaht(s.socialSecurity)}</td>
                <td className="num">{fmtBaht(s.withholdingTax)}</td>
                <td className="num"><b>{fmtBaht(s.netPay)}</b></td>
                <td><Link href={`/payslips/${s.id}`}>สลิป</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft && period.payslips.length > 0 && (
        <>
          <h2>ปรับโบนัส / รายการหักอื่น ๆ</h2>
          {period.payslips.map((s) => (
            <form key={s.id} action={updatePayslipAction} className="card row">
              <input type="hidden" name="periodId" value={period.id} />
              <input type="hidden" name="slipId" value={s.id} />
              <b style={{ minWidth: 180 }}>{s.employee.code} {s.employee.name}</b>
              <label>โบนัส/อื่น ๆ (บาท)<input name="bonus" type="number" step="0.01" min="0" defaultValue={toBahtInput(s.bonus)} /></label>
              <label>หักอื่น ๆ (บาท)<input name="otherDeduction" type="number" step="0.01" min="0" defaultValue={toBahtInput(s.otherDeduction)} /></label>
              <label style={{ flex: 1 }}>หมายเหตุ<input name="note" defaultValue={s.note ?? ''} /></label>
              <button className="btn">บันทึก</button>
            </form>
          ))}
        </>
      )}
    </main>
  );
}
