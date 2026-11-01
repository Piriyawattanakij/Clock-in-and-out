import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { cancelLeaveAction } from '@/app/actions/leave';
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABEL, type LeaveStatus } from '@/lib/leave';
import { leaveBalances } from '@/lib/leave-service';
import { fmtDate, toDateStr } from '@/lib/time';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { LeaveRequestForm } from './LeaveRequestForm';

export const dynamic = 'force-dynamic';

export default async function LeavePage() {
  const user = await requireUser();
  const today = toDateStr(new Date());
  const year = today.slice(0, 4);
  const [{ of }, requests] = await Promise.all([
    leaveBalances([user.id], year),
    prisma.leaveRequest.findMany({
      where: { employeeId: user.id, endDate: { gte: `${Number(year) - 1}-12-01` } },
      include: { leaveType: true },
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      take: 50,
    }),
  ]);
  const balances = of(user.id);

  return (
    <main className="container narrow">
      <h1>วันลา</h1>
      <div className="section-title"><h2>สิทธิ์ลาปี {Number(year) + 543}</h2></div>
      <div className="balance-grid">
        {balances.map(({ type, used, pending, remaining }) => (
          <div key={type.id} className="stat-tile balance" style={{ ['--c' as string]: type.color }}>
            <div className="label">{type.name}</div>
            <div className="value">
              {remaining === null ? `${used} วัน` : <>{remaining}<small> / {type.annualQuota} วัน</small></>}
            </div>
            <div className="sub">
              {remaining === null ? 'ใช้ไปปีนี้' : `เหลือ · ใช้ไป ${used}`}
              {pending > 0 && ` · รอ ${pending}`}
            </div>
            {type.annualQuota !== null && type.annualQuota > 0 && (
              <div className="bar"><span style={{ width: `${Math.min(100, (used / type.annualQuota) * 100)}%` }} /></div>
            )}
          </div>
        ))}
      </div>

      <div className="section-title"><h2>ขอลา</h2></div>
      <LeaveRequestForm
        today={today}
        types={balances.map(({ type, remaining }) => ({
          id: type.id,
          name: type.name,
          color: type.color,
          note: !type.paid ? 'ไม่ได้รับค่าจ้าง' : remaining === null ? 'ได้รับค่าจ้าง' : `เหลือ ${remaining} วัน`,
        }))}
      />

      <div className="section-title"><h2>คำขอของฉัน</h2></div>
      <div className="list">
        {requests.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>ยังไม่มีคำขอลา</p>}
        {requests.map((r) => {
          const st = r.status as LeaveStatus;
          const cancellable = st === 'PENDING' || (st === 'APPROVED' && r.startDate > today);
          return (
            <div key={r.id} className={`list-item ${st === 'CANCELLED' || st === 'REJECTED' ? 'dim' : ''}`}>
              <span className="leave-swatch" style={{ background: r.leaveType.color }} />
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <b>{r.leaveType.name}</b>
                  <span className={`badge ${LEAVE_STATUS_BADGE[st]}`}>{LEAVE_STATUS_LABEL[st]}</span>
                </div>
                <div className="sub">
                  {r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`} · {r.days} วัน
                </div>
                {r.reason && <div className="sub">เหตุผล: {r.reason}</div>}
                {r.reviewNote && <div className="sub">หมายเหตุผู้ดูแล: {r.reviewNote}</div>}
              </div>
              {cancellable && (
                <form action={cancelLeaveAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <ConfirmSubmit className="btn btn-sm" message="ยกเลิกคำขอลานี้?">ยกเลิก</ConfirmSubmit>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
