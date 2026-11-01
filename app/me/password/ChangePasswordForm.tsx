'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { changePasswordAction } from '@/app/actions/auth';
import { MIN_PASSWORD } from '@/lib/password';

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  const [show, setShow] = useState(false);
  // จำไว้ตั้งแต่ตอนเปิดหน้า เพราะหลังบันทึกสำเร็จ หน้าจะโหลดใหม่และ forced จะกลายเป็น false
  const [wasForced] = useState(forced);
  const type = show ? 'text' : 'password';

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.replace(wasForced ? '/' : '/me'), 1200);
      return () => clearTimeout(t);
    }
  }, [state, wasForced, router]);

  if (state?.ok) {
    return (
      <div className="alert alert-ok" style={{ margin: 0 }}>
        <CircleCheck size={20} /> เปลี่ยนรหัสผ่านเรียบร้อยแล้ว
      </div>
    );
  }

  return (
    <form action={action} style={{ display: 'grid', gap: 14 }}>
      <label>
        {forced ? 'รหัสผ่านชั่วคราว (ที่ได้รับจากผู้ดูแล)' : 'รหัสผ่านปัจจุบัน'}
        <input name="current" type={type} autoComplete="current-password" required />
      </label>
      <label>
        รหัสผ่านใหม่ (อย่างน้อย {MIN_PASSWORD} ตัวอักษร)
        <input name="next" type={type} autoComplete="new-password" minLength={MIN_PASSWORD} required />
      </label>
      <label>
        ยืนยันรหัสผ่านใหม่
        <input name="confirm" type={type} autoComplete="new-password" minLength={MIN_PASSWORD} required />
      </label>
      <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => setShow((v) => !v)}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />} {show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
      </button>
      {state?.error && (
        <div className="alert alert-err" style={{ margin: 0 }}><CircleAlert size={20} /> {state.error}</div>
      )}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? <><LoaderCircle size={18} className="spin" /> กำลังบันทึก…</> : 'บันทึกรหัสผ่านใหม่'}
      </button>
    </form>
  );
}
