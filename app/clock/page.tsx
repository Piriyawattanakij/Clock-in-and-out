import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { nextPunchType } from '@/lib/attendance';
import { atTime, fmtDate, fmtTime, toDateStr, addDays } from '@/lib/time';
import { ClockPanel } from './ClockPanel';

export const dynamic = 'force-dynamic';

export default async function ClockPage() {
  const user = await requireUser();
  const today = toDateStr(new Date());
  const [store, last, todays] = await Promise.all([
    user.storeId ? prisma.store.findUnique({ where: { id: user.storeId } }) : null,
    prisma.attendance.findFirst({ where: { employeeId: user.id, voidedAt: null }, orderBy: { timestamp: 'desc' } }),
    prisma.attendance.findMany({
      where: { employeeId: user.id, voidedAt: null, timestamp: { gte: atTime(today, '00:00'), lt: atTime(addDays(today, 1), '00:00') } },
      orderBy: { timestamp: 'asc' },
    }),
  ]);
  const next = nextPunchType(last);

  return (
    <main className="container narrow">
      <h1>สวัสดี {user.name}</h1>
      <div className="card">
        <div className="muted" style={{ textAlign: 'center' }}>{fmtDate(new Date())}</div>
        {store ? (
          <>
            <ClockPanel nextType={next} storeName={store.name} radiusM={store.radiusM} />
            {next === 'OUT' && last && (
              <p className="muted" style={{ textAlign: 'center' }}>ตอกเข้าล่าสุดเวลา {fmtTime(last.timestamp)} น.</p>
            )}
          </>
        ) : (
          <div className="alert alert-warn">คุณยังไม่ได้ถูกกำหนดร้าน กรุณาติดต่อผู้ดูแลระบบ</div>
        )}
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>วันนี้</h2>
          <span className="spacer" />
          <Link href="/history">ดูประวัติทั้งหมด →</Link>
        </div>
        {todays.length === 0 ? (
          <p className="muted">ยังไม่มีการตอกเวลา</p>
        ) : (
          <table>
            <tbody>
              {todays.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className={`badge ${a.type === 'IN' ? 'badge-ok' : 'badge-err'}`}>{a.type === 'IN' ? 'เข้า' : 'ออก'}</span>
                  </td>
                  <td>{fmtTime(a.timestamp)} น.</td>
                  <td className="muted">{a.source === 'MANUAL' ? 'แก้ไขโดยผู้ดูแล' : a.distanceM != null ? `${Math.round(a.distanceM)} ม.` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
