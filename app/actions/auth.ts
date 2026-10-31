'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const code = String(formData.get('code') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!code || !password) return { error: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน' };

  const user = await prisma.employee.findUnique({ where: { code } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
  }
  await createSession(user.id);
  redirect(user.role === 'ADMIN' ? '/admin' : '/clock');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
