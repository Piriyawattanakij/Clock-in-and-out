import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fmtBaht } from '@/lib/money';
import { Icon } from '@/components/Icon';

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
      <h1>สลิปเงินเดือน</h1>
      {slips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <Receipt size={40} className="muted" />
          <p className="muted">ยังไม่มีสลิปเงินเดือน</p>
        </div>
      ) : (
        <div className="list">
          {slips.map((s) => (
            <Link key={s.id} href={`/payslips/${s.id}`} className="list-item">
              <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                <Receipt size={22} />
              </span>
              <div className="grow">
                <b>{s.period.name}</b>
                <div className="sub">
                  {s.period.status === 'PAID' ? <span className="badge badge-ok">จ่ายแล้ว</span> : <span className="badge">รอจ่าย</span>}
                </div>
              </div>
              <div className="amount">฿{fmtBaht(s.netPay)}</div>
              <Icon name="chevron" size={18} className="muted" />
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
