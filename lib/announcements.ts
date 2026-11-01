import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { toDateStr } from './time';

type Viewer = { id: number; storeId: number | null };

/** ประกาศที่ผู้ใช้คนนี้ควรเห็น: ทุกสาขา หรือสาขาของตัวเอง และยังไม่หมดอายุ */
export function visibleTo(user: Viewer, today = toDateStr(new Date())): Prisma.AnnouncementWhereInput {
  return {
    AND: [
      { OR: [{ storeId: null }, ...(user.storeId ? [{ storeId: user.storeId }] : [])] },
      { OR: [{ expiresAt: null }, { expiresAt: { gte: today } }] },
    ],
  };
}

export const unreadWhere = (user: Viewer): Prisma.AnnouncementWhereInput => ({
  ...visibleTo(user),
  reads: { none: { employeeId: user.id } },
});

export function unreadCount(user: Viewer) {
  return prisma.announcement.count({ where: unreadWhere(user) });
}

/** พนักงานที่เป็นกลุ่มเป้าหมายของประกาศ (ใช้นับยอดอ่าน) */
export function audienceWhere(a: { storeId: number | null; createdById: number }): Prisma.EmployeeWhereInput {
  return { active: true, id: { not: a.createdById }, ...(a.storeId ? { storeId: a.storeId } : {}) };
}
