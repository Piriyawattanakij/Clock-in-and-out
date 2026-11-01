import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { PAY_TYPE_LABEL, type PayType } from '@/lib/payroll';

const baht = (s: number) => (s / 100).toFixed(2);
const csv = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });
  const id = Number((await params).id);
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: { payslips: { include: { employee: true }, orderBy: { employee: { code: 'asc' } } } },
  });
  if (!period) return new Response('Not found', { status: 404 });

  const header = [
    'รหัส', 'ชื่อ', 'ประเภทค่าจ้าง', 'ฐานค่าจ้าง', 'วันทำงาน', 'ลา (วัน)', 'ลาไม่รับเงิน (วัน)', 'ขาด (วัน)', 'สาย (นาที)', 'OT (นาที)', 'ทำงานวันหยุด (นาที)', 'OT วันหยุด (นาที)',
    'ค่าจ้างปกติ', 'ค่าทำงานวันหยุด', 'ค่า OT', 'เบี้ยเลี้ยง', 'โบนัส', 'เงินรางวัลสะสม', 'หักสาย', 'หักขาด', 'รวมรายได้',
    'ประกันสังคม', 'ภาษีหัก ณ ที่จ่าย', 'หักอื่น ๆ', 'รับสุทธิ', 'ธนาคาร', 'เลขบัญชี', 'เลขผู้เสียภาษี', 'หมายเหตุ',
  ];
  const rows = period.payslips.map((s) => [
    s.employee.code, s.employee.name, PAY_TYPE_LABEL[s.payType as PayType], baht(s.baseSalary), s.workDays, s.leaveDays, s.unpaidLeaveDays, s.absentDays,
    s.lateMinutes, s.otMinutes, s.holidayWorkMinutes, s.holidayOtMinutes,
    baht(s.basePay), baht(s.holidayPay), baht(s.otPay), baht(s.allowance), baht(s.bonus), baht(s.rewardPay), baht(s.lateDeduction), baht(s.absentDeduction),
    baht(s.grossPay), baht(s.socialSecurity), baht(s.withholdingTax), baht(s.otherDeduction), baht(s.netPay),
    s.employee.bankName, s.employee.bankAccount, s.employee.taxId, s.note,
  ]);
  // ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยได้ถูกต้อง
  const body = '﻿' + [header, ...rows].map((r) => r.map(csv).join(',')).join('\r\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payroll-${period.startDate}-${period.endDate}.csv"`,
    },
  });
}
