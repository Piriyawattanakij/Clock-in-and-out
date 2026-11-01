import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { employeeDays } from '@/lib/payroll-service';
import { fmtMinutes, monthLabel, monthRange, shiftMonth, toDateStr } from '@/lib/time';
import { DaysTable } from '@/components/DaysTable';

export const dynamic = 'force-dynamic';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const current = toDateStr(new Date()).slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : current;
  const { start, end } = monthRange(month);
  const days = await employeeDays(user.id, start, end);
  const workDays = days.filter((d) => d.status === 'PRESENT' || d.status === 'INCOMPLETE').length;
  const late = days.reduce((a, d) => a + d.lateMinutes, 0);
  const ot = days.reduce((a, d) => a + d.otMinutes, 0);
  const absent = days.filter((d) => d.status === 'ABSENT').length;

  return (
    <main className="container narrow" style={{ maxWidth: 900 }}>
      <h1>ประวัติการทำงาน</h1>
      <div className="month-nav">
        <Link className="icon-btn" href={`?month=${shiftMonth(month, -1)}`} aria-label="เดือนก่อน"><ChevronLeft size={20} /></Link>
        <b>{monthLabel(month)}</b>
        {month < current ? (
          <Link className="icon-btn" href={`?month=${shiftMonth(month, 1)}`} aria-label="เดือนถัดไป"><ChevronRight size={20} /></Link>
        ) : (
          <span className="icon-btn" style={{ opacity: 0.3 }}><ChevronRight size={20} /></span>
        )}
      </div>
      <div className="stats4">
        <div className="stat-tile"><div className="label" style={{ justifyContent: 'center' }}>มาทำงาน</div><div className="value">{workDays} วัน</div></div>
        <div className="stat-tile"><div className="label" style={{ justifyContent: 'center' }}>สาย</div><div className="value" style={{ color: late ? 'var(--err)' : undefined }}>{late ? fmtMinutes(late) : '-'}</div></div>
        <div className="stat-tile"><div className="label" style={{ justifyContent: 'center' }}>OT</div><div className="value">{ot ? fmtMinutes(ot) : '-'}</div></div>
        <div className="stat-tile"><div className="label" style={{ justifyContent: 'center' }}>ขาด</div><div className="value" style={{ color: absent ? 'var(--err)' : undefined }}>{absent} วัน</div></div>
      </div>
      <DaysTable days={days} />
    </main>
  );
}
