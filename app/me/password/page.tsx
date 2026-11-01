import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { ChangePasswordForm } from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  const forced = user.mustChangePassword;
  return (
    <main className="container narrow">
      {!forced && (
        <Link href="/me" className="row muted" style={{ gap: 4, marginBottom: 8 }}><ArrowLeft size={16} /> บัญชี</Link>
      )}
      <h1>{forced ? 'ตั้งรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่าน'}</h1>
      {forced && (
        <div className="alert alert-warn">
          <ShieldCheck size={20} />
          <span>รหัสผ่านปัจจุบันเป็นรหัสชั่วคราวที่ผู้ดูแลตั้งให้ กรุณาตั้งรหัสผ่านใหม่ของคุณเองก่อนเริ่มใช้งาน</span>
        </div>
      )}
      <div className="card" style={{ padding: 20 }}>
        <ChangePasswordForm forced={forced} />
      </div>
      <p className="muted">เมื่อเปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นที่เคยเข้าสู่ระบบไว้จะถูกออกจากระบบอัตโนมัติ</p>
    </main>
  );
}
