import { redirect } from 'next/navigation';
import { Clock } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  return (
    <main className="login-screen">
      <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>
        <div className="brand-mark"><Clock size={36} /></div>
        <h1 style={{ textAlign: 'center', margin: '0 0 4px' }}>ตอกเวลา</h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0, marginBottom: 24 }}>เข้าสู่ระบบเพื่อตอกเวลาเข้า-ออกงาน</p>
        <div className="card" style={{ padding: 20 }}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
