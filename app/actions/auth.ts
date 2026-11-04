'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { afterFailure, CODE_RULE, IP_RULE, lockRemaining, type ThrottleRule } from '@/lib/throttle';
import { prisma } from '@/lib/db';
import { createSession, destroySession, getCurrentUser } from '@/lib/auth';
import { validateNewPassword } from '@/lib/password';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const code = String(formData.get('code') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!code || !password) return { error: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน' };

  const ip = ((await headers()).get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const keys: [string, ThrottleRule][] = [
    [`code:${code.toLowerCase()}`, CODE_RULE],
    [`ip:${ip}`, IP_RULE],
  ];
  const now = new Date();
  const states = await prisma.loginThrottle.findMany({ where: { key: { in: keys.map(([k]) => k) } } });
  const wait = Math.max(0, ...states.map((st) => lockRemaining(st, now)));
  if (wait > 0) return { error: `ใส่รหัสผิดหลายครั้งเกินไป กรุณารอ ${Math.ceil(wait / 60_000)} นาที แล้วลองใหม่` };

  const user = await prisma.employee.findUnique({ where: { code } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    for (const [key, rule] of keys) {
      const next = afterFailure(states.find((st) => st.key === key), now, rule);
      await prisma.loginThrottle.upsert({ where: { key }, update: next, create: { key, ...next } });
    }
    return { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
  }
  await prisma.loginThrottle.deleteMany({ where: { key: { in: keys.map(([k]) => k) } } });
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
