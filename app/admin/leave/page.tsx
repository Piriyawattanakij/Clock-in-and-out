import { CalendarClock } from 'lucide-react';
import { prisma } from '@/lib/db';
import { approveLeaveAction, rejectLeaveAction, reviewLeaveAction, saveLeaveTypeAction } from '@/app/admin/actions';
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABEL, type LeaveStatus } from '@/lib/leave';
import { leaveBalances } from '@/lib/leave-service';
import { fmtDate, fmtDateTime, toDateStr } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { Flash } from '@/components/Flash';
import { LeaveGrid } from '@/components/LeaveGrid';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';

export const dynamic = 'force-dynamic';

const range = (s: string, e: string) => (s === e ? fmtDate(s) : `${fmtDate(s)} – ${fmtDate(e)}`);

export default async function AdminLeavePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; month?: string }> }) {
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : today.slice(0, 7);
  const back = `/admin/leave?month=${month}`;
  const [pending, recent, types] = await Promise.all([
    prisma.leaveRequest.findMany({ where: { status: 'PENDING' }, include: { employee: true, leaveType: true }, orderBy: { startDate: 'asc' } }),
    prisma.leaveRequest.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED', 'CANCELLED'] }, reviewedAt: { not: null } },
      include: { employee: true, leaveType: true },
      orderBy: { reviewedAt: 'desc' },
      take: 15,
    }),
    prisma.leaveType.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
  ]);
  const { of } = await leaveBalances([...new Set(pending.map((p) => p.employeeId))], today.slice(0, 4));

  return (
    <main className="container">
      <h1>วันลา</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <div className="section-title"><h2>รออนุมัติ ({pending.length})</h2></div>
      {pending.length === 0 ? (
        <div className="card muted" style={{ textAlign: 'center' }}>ไม่มีคำขอที่รออนุมัติ</div>
      ) : (
        <div className="list" style={{ marginBottom: 16 }}>
          {pending.map((r) => {
            const bal = of(r.employeeId).find((b) => b.type.id === r.leaveTypeId);
            const over = bal && bal.remaining !== null && r.days > bal.remaining;
            return (
              <div key={r.id} className="list-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Avatar emp={r.employee} size={44} />
                <div className="grow" style={{ minWidth: 200 }}>
                  <b>{r.employee.name}</b>
                  <div className="row" style={{ gap: 6, marginTop: 2 }}>
                    <span className="badge" style={{ background: r.leaveType.color + '22', color: r.leaveType.color, borderColor: 'transparent' }}>{r.leaveType.name}</span>
                    <span className="sub">{range(r.startDate, r.endDate)} · {r.days} วัน</span>
                  </div>
                  {r.reason && <div className="sub" style={{ marginTop: 4 }}>เหตุผล: {r.reason}</div>}
                  {bal && bal.remaining !== null && (
                    <div className="sub" style={{ marginTop: 4, color: over ? 'var(--err)' : undefined }}>
                      สิทธิ์คงเหลือ {bal.remaining}/{bal.type.annualQuota} วัน{over ? ' — เกินสิทธิ์ ส่วนที่เกินจะเป็นลาไม่รับเงิน' : ''}
                    </div>
                  )}
                  <div className="sub"><CalendarClock size={12} /> ส่งเมื่อ {fmtDateTime(r.createdAt)}</div>
                </div>
                <form action={approveLeaveAction} className="row review-form">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="back" value={back} />
                  <input name="note" placeholder="หมายเหตุ (ไม่บังคับ)" maxLength={200} />
                  <button className="btn btn-sm btn-approve">อนุมัติ</button>
                  <button className="btn btn-sm btn-danger" formAction={rejectLeaveAction}>ไม่อนุมัติ</button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <LeaveGrid month={month} basePath="/admin/leave" />

      <div className="section-title"><h2>ดำเนินการล่าสุด</h2></div>
      <div className="card table-wrap">
        <table>
          <tbody>
            {recent.length === 0 && <tr><td className="muted">ยังไม่มี</td></tr>}
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.employee.name}</td>
                <td>{r.leaveType.name}</td>
                <td>{range(r.startDate, r.endDate)}</td>
                <td><span className={`badge ${LEAVE_STATUS_BADGE[r.status as LeaveStatus]}`}>{LEAVE_STATUS_LABEL[r.status as LeaveStatus]}</span></td>
                <td>
                  {r.status === 'APPROVED' && (
                    <form action={reviewLeaveAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={back} />
                      <input type="hidden" name="decision" value="CANCEL" />
                      <ConfirmSubmit className="btn btn-sm" message="ยกเลิกการลาที่อนุมัติแล้วนี้? พนักงานจะได้รับแจ้งเตือน">ยกเลิกการลา</ConfirmSubmit>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title" id="types"><h2>ประเภทการลา</h2></div>
      <p className="muted" style={{ marginTop: -4 }}>
        ค่าเริ่มต้นอ้างอิงกฎหมายแรงงาน (ลาป่วยได้รับค่าจ้างไม่เกิน 30 วัน/ปี, ลากิจ 3 วัน, พักร้อน 6 วันเมื่อทำงานครบ 1 ปี) ลาเกินสิทธิ์ส่วนที่เกินคิดเป็นไม่ได้รับค่าจ้าง
      </p>
      {[...types, null].map((t) => (
        <form key={t?.id ?? 'new'} action={saveLeaveTypeAction} className="card row" style={{ alignItems: 'flex-end' }}>
          {t && <input type="hidden" name="id" value={t.id} />}
          <label style={{ flex: '1 1 160px' }}>{t ? 'ชื่อ' : 'เพิ่มประเภทใหม่'}<input name="name" defaultValue={t?.name} required /></label>
          <label style={{ width: 130 }}>สิทธิ์/ปี (วัน)<input name="annualQuota" type="number" min={0} defaultValue={t?.annualQuota ?? ''} placeholder="ไม่จำกัด" /></label>
          <label style={{ width: 70 }}>สี<input name="color" type="color" defaultValue={t?.color ?? '#3b82f6'} style={{ padding: 2, height: 42 }} /></label>
          <label className="check"><input type="checkbox" name="paid" defaultChecked={t?.paid ?? true} /> ได้รับค่าจ้าง</label>
          <label className="check"><input type="checkbox" name="active" defaultChecked={t?.active ?? true} /> ใช้งาน</label>
          <button className="btn">{t ? 'บันทึก' : 'เพิ่ม'}</button>
        </form>
      ))}
    </main>
  );
}
