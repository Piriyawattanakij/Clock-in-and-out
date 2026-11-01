import 'server-only';
import { prisma } from './db';

/** สิทธิ์ลาที่ใช้ไป/รออนุมัติ ในปีปฏิทินนี้ แยกตามประเภท */
export async function leaveBalances(employeeIds: number[], year: string) {
  const [types, reqs] = await Promise.all([
    prisma.leaveType.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    prisma.leaveRequest.findMany({
      where: { employeeId: { in: employeeIds }, status: { in: ['APPROVED', 'PENDING'] }, startDate: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
      select: { employeeId: true, leaveTypeId: true, status: true, days: true },
    }),
  ]);
  const of = (employeeId: number) =>
    types.map((t) => {
      const mine = reqs.filter((r) => r.employeeId === employeeId && r.leaveTypeId === t.id);
      const used = mine.filter((r) => r.status === 'APPROVED').reduce((a, r) => a + r.days, 0);
      const pending = mine.filter((r) => r.status === 'PENDING').reduce((a, r) => a + r.days, 0);
      return { type: t, used, pending, remaining: t.annualQuota === null ? null : Math.max(0, t.annualQuota - used) };
    });
  return { types, of };
}
