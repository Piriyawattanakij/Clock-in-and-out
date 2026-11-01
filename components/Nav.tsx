import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { BottomNav } from './BottomNav';
import { BrandLogo } from './BrandLogo';
import { NotificationBell } from './NotificationBell';

export async function Nav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = user.role === 'ADMIN';
  return (
    <>
      {/* คอมพิวเตอร์: แถบด้านบน */}
      <header className="nav">
        <div className="inner">
          <Link href="/" className="brand"><BrandLogo height={34} /><span className="brand-sub">บันทึกเวลาเข้า-ออก</span></Link>
          <Link href="/clock" className="link">บันทึกเวลา</Link>
          <Link href="/history" className="link">ประวัติ</Link>
          <Link href="/leave" className="link">วันลา</Link>
          <Link href="/payslips" className="link">สลิปเงินเดือน</Link>
          {admin && <Link href="/admin/menu" className="link admin-link">จัดการร้าน</Link>}
          <NotificationBell user={user} className="bell-sm" />
          <form action={logoutAction}>
            <button className="btn btn-sm" type="submit"><LogOut size={16} /> {user.name}</button>
          </form>
        </div>
      </header>
      {/* มือถือ: แถบด้านล่างแบบแอพ */}
      <BottomNav isAdmin={admin} />
    </>
  );
}
