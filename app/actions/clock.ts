'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { distanceMeters, isValidCoord } from '@/lib/geo';
import { nextPunchType } from '@/lib/attendance';
import { getSettings } from '@/lib/settings';
import { fmtTime } from '@/lib/time';

export interface ClockResult {
  ok: boolean;
  message: string;
  distanceM?: number;
}

/**
 * บันทึกเวลา — การตรวจระยะทั้งหมดทำที่ server
 * ระบบเป็นคนเลือกเองว่าเป็นการบันทึกเข้าหรือออก (จากรายการล่าสุด)
 */
export async function clockAction(input: { latitude: number; longitude: number; accuracy: number }): Promise<ClockResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  if (user.mustChangePassword) return { ok: false, message: 'กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน' };

  const { latitude, longitude } = input;
  const accuracy = Number(input.accuracy);
  if (!isValidCoord(latitude, longitude) || !Number.isFinite(accuracy)) {
    return { ok: false, message: 'ข้อมูลตำแหน่งไม่ถูกต้อง' };
  }
  if (!user.storeId) return { ok: false, message: 'คุณยังไม่ได้ถูกกำหนดร้าน กรุณาติดต่อผู้ดูแล' };

  const [store, settings] = await Promise.all([prisma.store.findUnique({ where: { id: user.storeId } }), getSettings()]);
  if (!store) return { ok: false, message: 'ไม่พบข้อมูลร้าน' };

  if (accuracy > settings.maxAccuracyM) {
    return { ok: false, message: `สัญญาณ GPS ยังไม่แม่นยำพอ (±${Math.round(accuracy)} ม.) ลองออกไปที่โล่งหรือรอสักครู่แล้วลองใหม่` };
  }

  const distance = distanceMeters(latitude, longitude, store.latitude, store.longitude);
  if (distance > store.radiusM) {
    return {
      ok: false,
      distanceM: distance,
      message: `คุณอยู่นอกพื้นที่ร้าน (ห่าง ${Math.round(distance)} ม. / อนุญาต ${store.radiusM} ม.)`,
    };
  }

  const now = new Date();
  const last = await prisma.attendance.findFirst({
    where: { employeeId: user.id, voidedAt: null },
    orderBy: { timestamp: 'desc' },
  });
  if (last && now.getTime() - last.timestamp.getTime() < 60_000) {
    return { ok: false, message: 'เพิ่งบันทึกเวลาไปเมื่อสักครู่ กรุณารอ 1 นาที' };
  }
  const type = nextPunchType(last, now);

  await prisma.attendance.create({
    data: {
      employeeId: user.id,
      storeId: store.id,
      type,
      timestamp: now,
      latitude,
      longitude,
      accuracyM: accuracy,
      distanceM: distance,
      source: 'GPS',
      userAgent: (await headers()).get('user-agent')?.slice(0, 300) ?? null,
    },
  });
  revalidatePath('/clock');

  return {
    ok: true,
    distanceM: distance,
    message: `บันทึกเวลา${type === 'IN' ? 'เข้า' : 'ออก'}งานสำเร็จ เวลา ${fmtTime(now)} น. (ห่างจากร้าน ${Math.round(distance)} ม.)`,
  };
}
