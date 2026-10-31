import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  return (
    <main className="container narrow">
      <h1 style={{ textAlign: 'center', marginTop: 48 }}>⏱ ระบบตอกเวลา</h1>
      <div className="card">
        <LoginForm />
      </div>
    </main>
  );
}
