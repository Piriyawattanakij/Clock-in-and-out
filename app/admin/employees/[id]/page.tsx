import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { employeeDays } from '@/lib/payroll-service';
import { monthRange, toDateStr } from '@/lib/time';
import { DaysTable } from '@/components/DaysTable';
import { Flash } from '@/components/Flash';
import { EmployeeForm } from '../EmployeeForm';

export const dynamic = 'force-dynamic';

export default async function EmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; month?: string }>;
}) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const emp = Number.isInteger(id) ? await prisma.employee.findUnique({ where: { id } }) : null;
  if (!emp) notFound();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : toDateStr(new Date()).slice(0, 7);
  const { start, end } = monthRange(month);
  const [stores, shifts, days] = await Promise.all([prisma.store.findMany(), prisma.shift.findMany(), employeeDays(emp.id, start, end)]);

  return (
    <main className="container">
      <Link href="/admin/employees">← พนักงานทั้งหมด</Link>
      <h1>{emp.code} — {emp.name}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <EmployeeForm emp={emp} stores={stores} shifts={shifts} />
      <div className="card">
        <form className="row" method="get">
          <h2 style={{ margin: 0 }}>การทำงานรายเดือน</h2>
          <span className="spacer" />
          <input type="month" name="month" defaultValue={month} style={{ width: 'auto' }} />
          <button className="btn">แสดง</button>
        </form>
        <DaysTable days={days} />
      </div>
    </main>
  );
}
