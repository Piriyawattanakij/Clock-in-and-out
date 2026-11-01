import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { ADMIN_LINKS } from '@/lib/nav';
import { BottomNav } from './BottomNav';
import { Icon } from './Icon';

export async function Nav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = user.role === 'ADMIN';
  return (
    <>
      {/* คอมพิวเตอร์: แถบด้านบน */}
      <header className="nav">
        <div className="inner">
          <Link href="/" className="brand"><span className="logo"><Icon name="clock" size={18} /></span>ตอกเวลา</Link>
          <Link href="/clock" className="link">ตอกเวลา</Link>
          <Link href="/history" className="link">ประวัติ</Link>
          <Link href="/payslips" className="link">สลิปเงินเดือน</Link>
          {admin && ADMIN_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="link">{l.label}</Link>
          ))}
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
