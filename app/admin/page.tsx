import Link from 'next/link';
import { prisma } from '@/lib/db';
import { summarizeDays, toShiftDef, STATUS_LABEL } from '@/lib/attendance';
import { employedFrom, holidaySetFor, loadHolidays, loadPunches } from '@/lib/payroll-service';
import { getSettings } from '@/lib/settings';
import { fmtDate, fmtMinutes, fmtTime, toDateStr } from '@/lib/time';
import { Avatar } from '@/components/Avatar';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const today = toDateStr(new Date());
  const employees = await prisma.employee.findMany({ where: { active: true, role: 'STAFF' }, include: { shift: true, store: true }, orderBy: { code: 'asc' } });
  const [punches, holidays, settings] = await Promise.all([
    loadPunches(employees.map((e) => e.id), today, today),
    loadHolidays(today, today),
    getSettings(),
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
      employedFrom: employedFrom(e),
    });
    const last = own.at(-1);
    const working = last?.type === 'IN' && toDateStr(last.timestamp) >= today;
    return { e, d, working };
  });
  const present = rows.filter((r) => r.d.firstIn).length;
  const late = rows.filter((r) => r.d.lateMinutes > 0).length;

  return (
    <main className="container">
      <h1>ภาพรวมวันนี้ — {fmtDate(today)}</h1>
      <div className="grid">
        <div className="card stat"><span className="muted">พนักงานทั้งหมด</span><b>{rows.length}</b></div>
        <div className="card stat"><span className="muted">มาทำงานแล้ว</span><b>{present}</b></div>
        <div className="card stat"><span className="muted">กำลังทำงาน</span><b>{rows.filter((r) => r.working).length}</b></div>
        <div className="card stat"><span className="muted">มาสาย</span><b>{late}</b></div>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>พนักงาน</th><th>ร้าน</th><th>สถานะ</th><th>เข้า</th><th>ออก</th><th className="num">สาย</th></tr>
          </thead>
          <tbody>
            {rows.map(({ e, d, working }) => (
              <tr key={e.id}>
                <td><Link href={`/admin/employees/${e.id}`} className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><Avatar emp={e} size={32} />{e.code} {e.name}</Link></td>
                <td>{e.store?.name ?? '-'}</td>
                <td>
                  {working ? <span className="badge badge-ok">กำลังทำงาน</span>
                    : d.firstIn ? <span className="badge">ออกงานแล้ว</span>
                    : <span className="badge">{d.scheduled ? 'ยังไม่เข้างาน' : STATUS_LABEL.OFF}</span>}
                </td>
                <td>{fmtTime(d.firstIn)}</td>
                <td>{fmtTime(d.lastOut)}</td>
                <td className="num">{d.lateMinutes ? <span className="badge badge-err">{fmtMinutes(d.lateMinutes)}</span> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
