import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** ใช้ให้ Railway ตรวจว่าแอพและฐานข้อมูลพร้อมใช้งาน */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
