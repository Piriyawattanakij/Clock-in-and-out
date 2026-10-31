import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { PayslipView } from '@/components/PayslipView';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const slip = await prisma.payslip.findUnique({ where: { id }, include: { employee: true, period: true } });
  // พนักงานเห็นได้เฉพาะสลิปของตัวเองที่อนุมัติแล้ว / ผู้ดูแลเห็นได้ทั้งหมด
  const isAdmin = user.role === 'ADMIN';
  if (!slip || (!isAdmin && (slip.employeeId !== user.id || slip.period.status === 'DRAFT'))) notFound();

  return (
    <main className="container">
      <div className="row no-print" style={{ marginBottom: 12 }}>
        <Link href={isAdmin ? `/admin/payroll/${slip.periodId}` : '/payslips'}>← กลับ</Link>
        <span className="spacer" />
        <PrintButton />
      </div>
      {slip.period.status === 'DRAFT' && <div className="alert alert-warn no-print">งวดนี้ยังเป็นร่าง พนักงานยังมองไม่เห็นสลิปนี้</div>}
      <PayslipView slip={slip} />
    </main>
  );
}
