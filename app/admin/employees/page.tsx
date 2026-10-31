import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fmtBaht } from '@/lib/money';
import { PAY_TYPE_LABEL, type PayType } from '@/lib/payroll';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({ include: { store: true, shift: true }, orderBy: [{ active: 'desc' }, { code: 'asc' }] });
  return (
    <main className="container">
      <div className="row">
        <h1>พนักงาน</h1>
        <span className="spacer" />
        <Link className="btn btn-primary" href="/admin/employees/new">+ เพิ่มพนักงาน</Link>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>รหัส</th><th>ชื่อ</th><th>ตำแหน่ง</th><th>ร้าน</th><th>กะ</th><th>ค่าจ้าง</th><th>สถานะ</th></tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/admin/employees/${e.id}`}>{e.code}</Link></td>
                <td>{e.name} {e.role === 'ADMIN' && <span className="badge">ผู้ดูแล</span>}</td>
                <td>{e.position ?? '-'}</td>
                <td>{e.store?.name ?? '-'}</td>
                <td>{e.shift?.name ?? '-'}</td>
                <td>{fmtBaht(e.baseSalary)} ({PAY_TYPE_LABEL[e.payType as PayType]})</td>
                <td>{e.active ? <span className="badge badge-ok">ใช้งาน</span> : <span className="badge">ปิดใช้งาน</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
