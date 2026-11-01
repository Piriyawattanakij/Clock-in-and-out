import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { employeeDays } from '@/lib/payroll-service';
import { fmtMinutes, monthLabel, monthRange, shiftMonth, toDateStr } from '@/lib/time';
import { DaysTable } from '@/components/DaysTable';
import { MonthCalendar } from '@/components/MonthCalendar';

export const dynamic = 'force-dynamic';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const current = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : current;
  const { start, end } = monthRange(month);
  const days = await employeeDays(user.id, start, end);
  const sum = (f: (d: (typeof days)[number]) => number) => days.reduce((a, d) => a + f(d), 0);
  const workDays = days.filter((d) => d.status === 'PRESENT' || d.status === 'INCOMPLETE').length;
  const leave = days.filter((d) => d.status === 'LEAVE').length;
  const absent = days.filter((d) => d.status === 'ABSENT').length;
  const late = sum((d) => d.lateMinutes);
  const ot = sum((d) => d.otMinutes);
  const hours = sum((d) => d.regularMinutes);

  const tiles: [string, string, boolean?][] = [
    ['มาทำงาน', `${workDays} วัน`],
    ['ลา', `${leave} วัน`],
    ['ขาด', `${absent} วัน`, absent > 0],
    ['สาย', late ? fmtMinutes(late) : '-', late > 0],
    ['OT', ot ? fmtMinutes(ot) : '-'],
    ['ชั่วโมงรวม', hours ? `${Math.round(hours / 60)} ชม.` : '-'],
  ];

  return (
    <main className="container narrow" style={{ maxWidth: 900 }}>
      <div className="row" style={{ marginBottom: 4 }}>
        <h1 style={{ margin: 0 }}>ประวัติการทำงาน</h1>
        <span className="spacer" />
        <Link href="/leave" className="btn btn-sm"><Plus size={16} /> ขอลา</Link>
      </div>
      <div className="month-nav" style={{ marginTop: 12 }}>
        <Link className="icon-btn" href={`?month=${shiftMonth(month, -1)}`} aria-label="เดือนก่อน"><ChevronLeft size={20} /></Link>
        <b>{monthLabel(month)}</b>
        {month < current ? (
          <Link className="icon-btn" href={`?month=${shiftMonth(month, 1)}`} aria-label="เดือนถัดไป"><ChevronRight size={20} /></Link>
        ) : (
          <span className="icon-btn" style={{ opacity: 0.3 }}><ChevronRight size={20} /></span>
        )}
      </div>
      <div className="stats6">
        {tiles.map(([label, value, bad]) => (
          <div key={label} className="stat-tile">
            <div className="label">{label}</div>
            <div className="value" style={bad ? { color: 'var(--err)' } : undefined}>{value}</div>
          </div>
        ))}
      </div>
      <MonthCalendar
        today={today}
        days={days.map((d) => ({
          date: d.date,
          status: d.status,
          scheduled: d.scheduled,
          holiday: d.holiday,
          firstIn: d.firstIn?.toISOString() ?? null,
          lastOut: d.lastOut?.toISOString() ?? null,
          regularMinutes: d.regularMinutes,
          lateMinutes: d.lateMinutes,
          otMinutes: d.otMinutes,
          leave: d.leave ? { name: d.leave.name, color: d.leave.color, paid: d.leave.paid } : null,
        }))}
      />
      <DaysTable days={days} mobileList={false} />
    </main>
  );
}
