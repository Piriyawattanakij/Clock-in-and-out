import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './db';

const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s || 'dev-only-secret');
}

export async function createSession(employeeId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(employeeId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** โหลดผู้ใช้จากฐานข้อมูลทุกครั้ง เพื่อให้การปิดใช้งานพนักงานมีผลทันที */
export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const user = await prisma.employee.findUnique({ where: { id } });
    return user && user.active ? user : null;
  } catch {
    return null;
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/clock');
  return user;
}
