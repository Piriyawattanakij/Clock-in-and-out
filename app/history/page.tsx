import { requireUser } from '@/lib/auth';
import { employeeDays } from '@/lib/payroll-service';
import { monthRange, toDateStr } from '@/lib/time';
import { DaysTable } from '@/components/DaysTable';

export const dynamic = 'force-dynamic';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : toDateStr(new Date()).slice(0, 7);
  const { start, end } = monthRange(month);
  const days = await employeeDays(user.id, start, end);

  return (
    <main className="container">
      <h1>ประวัติการทำงาน</h1>
      <form className="row card" method="get">
        <label style={{ flexDirection: 'row', alignItems: 'center' }}>
          เดือน <input type="month" name="month" defaultValue={month} style={{ width: 'auto' }} />
        </label>
        <button className="btn">แสดง</button>
      </form>
      <div className="card">
        <DaysTable days={days} />
      </div>
    </main>
  );
}
