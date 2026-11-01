import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/** ส่งรูปพนักงาน — เห็นได้เฉพาะเจ้าของรูปและผู้ดูแล */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 });
  if (id !== user.id && user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
  const photo = await prisma.employeePhoto.findUnique({ where: { employeeId: id } });
  if (!photo) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: {
      'Content-Type': photo.mimeType,
      // URL มี ?v=เวลาอัปเดต จึง cache ได้นาน และเปลี่ยน URL เองเมื่อเปลี่ยนรูป
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
