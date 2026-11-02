import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { employeeDays } from '@/lib/payroll-service';
import { monthRange, toDateStr } from '@/lib/time';
import { DaysTable } from '@/components/DaysTable';
import { Flash } from '@/components/Flash';
import { Avatar } from '@/components/Avatar';
import { PhotoUploader } from '@/components/PhotoUploader';
import { EmployeeForm } from '../EmployeeForm';
import { walletOf } from '@/lib/reward-service';
import { resignationPayoutAction } from '@/app/admin/actions';
import { fmtBaht } from '@/lib/money';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';

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
      <div className="card">
        <PhotoUploader employeeId={emp.id} hasPhoto={!!emp.photoUpdatedAt}>
          <Avatar emp={emp} size={96} />
        </PhotoUploader>
      </div>
      <WalletCard employeeId={emp.id} />
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

async function WalletCard({ employeeId }: { employeeId: number }) {
  const w = await walletOf(employeeId);
  if (w.earned === 0) return null;
  return (
    <div className="card row">
      <div className="grow" style={{ flex: 1 }}>
        <b>🐷 กระปุก KICHI คงเหลือ ฿{fmtBaht(w.balance + w.pending)}</b>
        <div className="muted">สะสมทั้งหมด ฿{fmtBaht(w.earned)} · แลก/ตั้งจ่ายแล้ว ฿{fmtBaht(w.redeemed)}</div>
      </div>
      {w.balance + w.pending > 0 && (
        <form action={resignationPayoutAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <ConfirmSubmit className="btn btn-sm" message="ตั้งจ่ายเงินรางวัลคงเหลือทั้งหมดในงวดเงินเดือนถัดไป (กรณีลาออก)?">จ่ายเงินรางวัลคงเหลือ (ลาออก)</ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
