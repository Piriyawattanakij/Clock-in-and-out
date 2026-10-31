'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} style={{ display: 'grid', gap: 12 }}>
      <label>
        รหัสพนักงาน
        <input name="code" autoComplete="username" required autoFocus />
      </label>
      <label>
        รหัสผ่าน
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error && <div className="alert alert-err">{state.error}</div>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
