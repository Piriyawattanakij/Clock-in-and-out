import 'server-only';
import { prisma } from './db';

export interface NotificationInput {
  title: string;
  body?: string | null;
  link?: string | null;
}

export async function notify(employeeIds: number[], n: NotificationInput) {
  if (employeeIds.length === 0) return;
  await prisma.notification.createMany({ data: employeeIds.map((employeeId) => ({ employeeId, ...n })) });
}

export async function notifyAdmins(n: NotificationInput) {
  const admins = await prisma.employee.findMany({ where: { role: 'ADMIN', active: true }, select: { id: true } });
  await notify(admins.map((a) => a.id), n);
}
