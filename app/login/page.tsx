import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  return (
    <main className="login-screen">
      <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <div className="brand"><BrandLogo height={120} /></div>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 24 }}>ระบบบันทึกเวลาเข้า-ออก · เข้าสู่ระบบเพื่อเริ่มงาน</p>
        <div className="card" style={{ padding: 20 }}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
