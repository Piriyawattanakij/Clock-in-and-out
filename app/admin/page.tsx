import Link from 'next/link';
import { prisma } from '@/lib/db';
import { summarizeDays, toShiftDef, STATUS_LABEL } from '@/lib/attendance';
import { employedFrom, holidaySetFor, leavesFor, loadHolidays, loadLeaveContext, loadPunches, teamWhere } from '@/lib/payroll-service';
import { getSettings } from '@/lib/settings';
import { fmtDate, fmtMinutes, fmtTime, toDateStr } from '@/lib/time';
import { PhotoPreview } from '@/components/PhotoPreview';
import { LeaveGrid } from '@/components/LeaveGrid';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const employees = await prisma.employee.findMany({ where: teamWhere, include: { shift: true, store: true }, orderBy: { code: 'asc' } });
  const [punches, holidays, settings, leaveCtx] = await Promise.all([
    loadPunches(employees.map((e) => e.id), today, today),
    loadHolidays(today, today),
    getSettings(),
    loadLeaveContext(employees.map((e) => e.id), today, today),
  ]);
  const rows = employees.map((e) => {
    const own = punches.filter((p) => p.employeeId === e.id);
    const [d] = summarizeDays({
      punches: own,
      shift: toShiftDef(e.shift),
      holidays: holidaySetFor(holidays, e.storeId),
      startDate: today,
      endDate: today,
      today,
      otBlockMinutes: settings.otBlockMinutes,
      otGraceMinutes: settings.otGraceMinutes,
      employedFrom: employedFrom(e),
      leaves: leavesFor(leaveCtx, e),
    });
    const last = own.at(-1);
    const working = last?.type === 'IN' && toDateStr(last.timestamp) >= today;
    return { e, d, working };
  });
  // พนักงานที่ต้องบันทึกเวลา / ทีมบริหาร (ไม่ต้องบันทึกเวลา)
  const staff = rows.filter((r) => r.e.workMode !== 'EXEMPT');
  const mgmt = rows.filter((r) => r.e.workMode === 'EXEMPT');
  const present = staff.filter((r) => r.d.firstIn).length;
  const late = staff.filter((r) => r.d.lateMinutes > 0).length;

  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : today.slice(0, 7);
  const pendingLeave = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });
  const leaveBadge = (d: (typeof rows)[number]['d']) =>
    d.leave ? <span className="badge" style={{ background: d.leave.color + '22', color: d.leave.color, borderColor: 'transparent' }}>{d.leave.name}</span> : null;

  return (
    <main className="container">
      <h1>ภาพรวมวันนี้ — {fmtDate(today)}</h1>
      <div className="grid">
        <div className="card stat"><span className="muted">พนักงาน (บันทึกเวลา)</span><b>{staff.length}</b></div>
        <div className="card stat"><span className="muted">มาทำงานแล้ว</span><b>{present}</b></div>
        <div className="card stat"><span className="muted">กำลังทำงาน</span><b>{staff.filter((r) => r.working).length}</b></div>
        <div className="card stat"><span className="muted">มาสาย</span><b>{late}</b></div>
      </div>
      {pendingLeave > 0 && (
        <Link href="/admin/leave" className="list-item news-banner">
          <span className="news-icon"><Icon name="leave" size={20} /></span>
          <div className="grow"><b>มีคำขอลารออนุมัติ {pendingLeave} รายการ</b></div>
          <Icon name="chevron" size={18} className="muted" />
        </Link>
      )}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>พนักงาน</th><th>ร้าน</th><th>สถานะ</th><th>เข้า</th><th>ออก</th><th className="num">สาย</th></tr>
          </thead>
          <tbody>
            {staff.length === 0 && <tr><td colSpan={6} className="muted">ยังไม่มีพนักงานที่ต้องบันทึกเวลา</td></tr>}
            {staff.map(({ e, d, working }) => (
              <tr key={e.id}>
                <td>
                  <span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                    <PhotoPreview emp={e} size={32} caption={`${e.code}${e.position ? ` · ${e.position}` : ''}`} />
                    <Link href={`/admin/employees/${e.id}`}>{e.code} {e.name}</Link>
                  </span>
                </td>
                <td>{e.store?.name ?? '-'}</td>
                <td>
                  {working ? <span className="badge badge-ok">กำลังทำงาน</span>
                    : d.firstIn ? <span className="badge">ออกงานแล้ว</span>
                    : leaveBadge(d) ?? <span className="badge">{d.scheduled ? 'ยังไม่เข้างาน' : STATUS_LABEL.OFF}</span>}
                </td>
                <td>{fmtTime(d.firstIn)}</td>
                <td>{fmtTime(d.lastOut)}</td>
                <td className="num">{d.lateMinutes ? <span className="badge badge-err">{fmtMinutes(d.lateMinutes)}</span> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mgmt.length > 0 && (
        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <b>ทีมบริหาร</b>
            <span className="muted">ไม่ต้องบันทึกเวลา · คิดเงินเดือนเต็ม หักเฉพาะลาไม่รับเงิน</span>
          </div>
          <div className="mgmt-list">
            {mgmt.map(({ e, d, working }) => (
              <div key={e.id} className="mgmt-item">
                <PhotoPreview emp={e} size={40} caption={`${e.code}${e.position ? ` · ${e.position}` : ''}`} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <Link href={`/admin/employees/${e.id}`}><b>{e.name}</b></Link>
                  <div className="sub">{e.code}{e.position ? ` · ${e.position}` : ''}</div>
                </div>
                {leaveBadge(d) ?? (working ? <span className="badge badge-ok">อยู่ที่ร้าน</span>
                  : d.firstIn ? <span className="badge">มาแล้ว {fmtTime(d.firstIn)}</span>
                  : <span className="badge">{d.scheduled ? 'วันทำงาน' : STATUS_LABEL.OFF}</span>)}
              </div>
            ))}
          </div>
        </div>
      )}

      <LeaveGrid month={month} basePath="/admin" />
    </main>
  );
}
