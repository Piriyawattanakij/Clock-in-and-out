'use client';

import { useActionState } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { loginAction } from '@/app/actions/auth';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} style={{ display: 'grid', gap: 14 }}>
      <label>
        รหัสพนักงาน
        <input name="code" autoComplete="username" autoCapitalize="characters" required autoFocus />
      </label>
      <label>
        รหัสผ่าน
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error && (
        <div className="alert alert-err" style={{ margin: 0 }}><CircleAlert size={20} /> {state.error}</div>
      )}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? <><LoaderCircle size={18} className="spin" /> กำลังเข้าสู่ระบบ…</> : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
