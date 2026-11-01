'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession, destroySession, getCurrentUser } from '@/lib/auth';
import { validateNewPassword } from '@/lib/password';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const code = String(formData.get('code') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!code || !password) return { error: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน' };

  const user = await prisma.employee.findUnique({ where: { code } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
  }
  await createSession(user.id);
  redirect(user.mustChangePassword ? '/me/password' : user.role === 'ADMIN' ? '/admin' : '/clock');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

export async function changePasswordAction(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' };
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
  const err = validateNewPassword(next, confirm, current);
  if (err) return { error: err };
  await prisma.employee.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false, passwordChangedAt: new Date() },
  });
  await createSession(user.id); // เครื่องนี้ยังใช้ต่อได้ เครื่องอื่นจะถูกออกจากระบบ
  return { ok: true };
}
