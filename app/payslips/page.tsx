import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fmtBaht } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function PayslipsPage() {
  const user = await requireUser();
  const slips = await prisma.payslip.findMany({
    where: { employeeId: user.id, period: { status: { in: ['APPROVED', 'PAID'] } } },
    include: { period: true },
    orderBy: { period: { startDate: 'desc' } },
  });
  return (
    <main className="container narrow">
      <h1>สลิปเงินเดือนของฉัน</h1>
      <div className="card">
        {slips.length === 0 ? (
          <p className="muted">ยังไม่มีสลิปเงินเดือน</p>
        ) : (
          <table>
            <tbody>
              {slips.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/payslips/${s.id}`}>{s.period.name}</Link></td>
                  <td>{s.period.status === 'PAID' ? <span className="badge badge-ok">จ่ายแล้ว</span> : <span className="badge">รอจ่าย</span>}</td>
                  <td className="num">{fmtBaht(s.netPay)} บาท</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
