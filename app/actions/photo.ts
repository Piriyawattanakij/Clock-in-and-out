'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { MAX_PHOTO_BYTES, sniffImageType } from '@/lib/photo';

export interface PhotoResult {
  ok: boolean;
  message: string;
}

/** พนักงานเปลี่ยนรูปของตัวเองได้ ผู้ดูแลเปลี่ยนให้ทุกคนได้ */
async function authorize(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'กรุณาเข้าสู่ระบบใหม่' } as const;
  const targetId = Number(fd.get('employeeId') ?? user.id);
  if (!Number.isInteger(targetId)) return { error: 'ข้อมูลไม่ถูกต้อง' } as const;
  if (targetId !== user.id && user.role !== 'ADMIN') return { error: 'ไม่มีสิทธิ์เปลี่ยนรูปของพนักงานคนอื่น' } as const;
  return { targetId } as const;
}

function refresh(id: number) {
  for (const p of ['/clock', '/me', '/admin', '/admin/employees', `/admin/employees/${id}`]) revalidatePath(p);
}

export async function uploadPhotoAction(fd: FormData): Promise<PhotoResult> {
  const auth = await authorize(fd);
  if ('error' in auth) return { ok: false, message: auth.error! };
  const file = fd.get('photo');
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, message: 'กรุณาเลือกรูป' };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, message: 'ไฟล์รูปใหญ่เกินไป' };
  const data = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(data);
  if (!mimeType) return { ok: false, message: 'รองรับเฉพาะไฟล์รูป JPG, PNG หรือ WebP' };

  const employee = await prisma.employee.findUnique({ where: { id: auth.targetId } });
  if (!employee) return { ok: false, message: 'ไม่พบพนักงาน' };
  await prisma.$transaction([
    prisma.employeePhoto.upsert({
      where: { employeeId: auth.targetId },
      update: { data, mimeType },
      create: { employeeId: auth.targetId, data, mimeType },
    }),
    prisma.employee.update({ where: { id: auth.targetId }, data: { photoUpdatedAt: new Date() } }),
  ]);
  refresh(auth.targetId);
  return { ok: true, message: 'บันทึกรูปแล้ว' };
}

export async function removePhotoAction(fd: FormData): Promise<PhotoResult> {
  const auth = await authorize(fd);
  if ('error' in auth) return { ok: false, message: auth.error! };
  await prisma.$transaction([
    prisma.employeePhoto.deleteMany({ where: { employeeId: auth.targetId } }),
    prisma.employee.update({ where: { id: auth.targetId }, data: { photoUpdatedAt: null } }),
  ]);
  refresh(auth.targetId);
  return { ok: true, message: 'ลบรูปแล้ว' };
}
