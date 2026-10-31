import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';

export async function Nav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = user.role === 'ADMIN';
  return (
    <header className="nav">
      <div className="inner">
        <Link href="/" className="brand">⏱ ตอกเวลา</Link>
        <Link href="/clock" className="link">ตอกเวลา</Link>
        <Link href="/history" className="link">ประวัติ</Link>
        <Link href="/payslips" className="link">สลิปเงินเดือน</Link>
        {admin && (
          <>
            <Link href="/admin" className="link">ภาพรวม</Link>
            <Link href="/admin/employees" className="link">พนักงาน</Link>
            <Link href="/admin/stores" className="link">ร้าน</Link>
            <Link href="/admin/shifts" className="link">กะ/วันหยุด</Link>
            <Link href="/admin/attendance" className="link">การตอกเวลา</Link>
            <Link href="/admin/payroll" className="link">เงินเดือน</Link>
            <Link href="/admin/settings" className="link">ตั้งค่า</Link>
          </>
        )}
        <form action={logoutAction}>
          <button className="btn btn-sm" type="submit">ออกจากระบบ ({user.name})</button>
        </form>
      </div>
    </header>
  );
}
