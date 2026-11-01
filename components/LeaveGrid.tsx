import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { toShiftDef } from '@/lib/attendance';
import { holidaySetFor, loadHolidays } from '@/lib/payroll-service';
import { eachDate, monthLabel, monthRange, shiftMonth, toDateStr, weekday } from '@/lib/time';
import { Avatar } from './Avatar';

const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/** ตารางรายเดือน: พนักงาน × วันที่ แสดงว่าใครลาวันไหน (รวมคำขอที่รออนุมัติ) */
export async function LeaveGrid({ month, basePath }: { month: string; basePath: string }) {
  const { start, end } = monthRange(month);
  const today = toDateStr(new Date());
  const [employees, requests, holidays, types] = await Promise.all([
    // ไม่รวมบัญชีผู้ดูแลที่ไม่ได้เป็นพนักงานรับเงินเดือน
    prisma.employee.findMany({ where: { active: true, OR: [{ role: 'STAFF' }, { baseSalary: { gt: 0 } }] }, include: { shift: true }, orderBy: { code: 'asc' } }),
    prisma.leaveRequest.findMany({
      where: { status: { in: ['APPROVED', 'PENDING'] }, startDate: { lte: end }, endDate: { gte: start } },
      include: { leaveType: true },
    }),
    loadHolidays(start, end),
    prisma.leaveType.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
  ]);
  const dates = eachDate(start, end);
  const onLeave = new Map<string, number>(); // วันที่ → จำนวนคนลา (อนุมัติแล้ว)

  const rows = employees.map((e) => {
    const shift = toShiftDef(e.shift);
    const hol = holidaySetFor(holidays, e.storeId);
    const mine = requests.filter((r) => r.employeeId === e.id);
    const cells = dates.map((d) => {
      const off = hol.has(d) || !shift.workDays.includes(weekday(d));
      const r = off ? undefined : mine.find((x) => x.startDate <= d && d <= x.endDate);
      if (r?.status === 'APPROVED') onLeave.set(d, (onLeave.get(d) ?? 0) + 1);
      return { d, off, r };
    });
    return { e, cells };
  });

  return (
    <div className="card">
      <div className="month-nav" style={{ marginBottom: 10 }}>
        <Link className="icon-btn" href={`${basePath}?month=${shiftMonth(month, -1)}`} aria-label="เดือนก่อน"><ChevronLeft size={20} /></Link>
        <b>ตารางวันลา · {monthLabel(month)}</b>
        <Link className="icon-btn" href={`${basePath}?month=${shiftMonth(month, 1)}`} aria-label="เดือนถัดไป"><ChevronRight size={20} /></Link>
      </div>
      <div className="leave-grid-wrap">
        <table className="leave-grid">
          <thead>
            <tr>
              <th className="sticky">พนักงาน</th>
              {dates.map((d) => (
                <th key={d} className={`${d === today ? 'today' : ''} ${weekday(d) === 0 ? 'sun' : ''}`}>
                  <span>{WD[weekday(d)]}</span>
                  {Number(d.slice(8))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, cells }) => (
              <tr key={e.id}>
                <th className="sticky">
                  <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><Avatar emp={e} size={24} /> {e.name}</span>
                </th>
                {cells.map(({ d, off, r }) => (
                  <td
                    key={d}
                    className={`${off ? 'off' : ''} ${d === today ? 'today' : ''} ${r ? (r.status === 'PENDING' ? 'pending' : 'leave') : ''}`}
                    style={r ? { ['--c' as string]: r.leaveType.color } : undefined}
                    title={r ? `${e.name} · ${r.leaveType.name}${r.status === 'PENDING' ? ' (รออนุมัติ)' : ''}` : undefined}
                  />
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky">ลา (คน)</th>
              {dates.map((d) => <td key={d} className={onLeave.get(d) ? 'count' : ''}>{onLeave.get(d) || ''}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="row legend">
        {types.map((t) => <span key={t.id} className="row" style={{ gap: 4 }}><i className="sw" style={{ background: t.color }} />{t.name}</span>)}
        <span className="row" style={{ gap: 4 }}><i className="sw pending-sw" />รออนุมัติ</span>
        <span className="row" style={{ gap: 4 }}><i className="sw off-sw" />วันหยุด</span>
      </div>
    </div>
  );
}
