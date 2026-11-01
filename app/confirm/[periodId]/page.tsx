import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleCheck, Clock3, MessageSquareWarning } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { CONFIRM_BADGE, CONFIRM_LABEL, canConfirm, confirmState, slipSnapshot } from '@/lib/confirmation';
import { employeeDays } from '@/lib/payroll-service';
import { fmtBaht } from '@/lib/money';
import { fmtDate, fmtDateTime, fmtMinutes, toDateStr } from '@/lib/time';
import { MonthCalendar } from '@/components/MonthCalendar';
import { ConfirmForm } from './ConfirmForm';

export const dynamic = 'force-dynamic';

export default async function ConfirmPage({ params }: { params: Promise<{ periodId: string }> }) {
  const user = await requireUser();
  const periodId = Number((await params).periodId);
  if (!Number.isInteger(periodId)) notFound();
  const [period, slip, conf] = await Promise.all([
    prisma.payrollPeriod.findUnique({ where: { id: periodId } }),
    prisma.payslip.findUnique({ where: { periodId_employeeId: { periodId, employeeId: user.id } } }),
    prisma.periodConfirmation.findUnique({ where: { periodId_employeeId: { periodId, employeeId: user.id } } }),
  ]);
  if (!period || !slip) notFound();
  const today = toDateStr(new Date());
  const state = confirmState(conf, slipSnapshot(slip));
  const open = canConfirm(period, today);
  const days = await employeeDays(user.id, period.startDate, period.endDate);

  const tiles: [string, string][] = [
    ['มาทำงาน', `${slip.workDays} วัน`],
    ['ลา', `${slip.leaveDays + slip.unpaidLeaveDays} วัน`],
    ['ขาด', `${slip.absentDays} วัน`],
    ['สาย', slip.lateMinutes ? fmtMinutes(slip.lateMinutes) : '-'],
    ['OT', slip.otMinutes + slip.holidayOtMinutes ? fmtMinutes(slip.otMinutes + slip.holidayOtMinutes) : '-'],
    ['ชั่วโมงรวม', `${Math.round(slip.workMinutes / 60)} ชม.`],
  ];

  return (
    <main className="container narrow">
      <Link href="/payslips" className="row muted" style={{ gap: 4, marginBottom: 8 }}><ArrowLeft size={16} /> สลิปเงินเดือน</Link>
      <h1 style={{ marginBottom: 4 }}>ยืนยันวันทำงาน</h1>
      <p className="muted" style={{ marginTop: 0 }}>{period.name} · {fmtDate(period.startDate)} – {fmtDate(period.endDate)}</p>

      <div className="row" style={{ marginBottom: 12 }}>
        <span className={`badge ${CONFIRM_BADGE[state]}`}>{CONFIRM_LABEL[state]}</span>
        {conf && <span className="muted">ตอบล่าสุด {fmtDateTime(conf.respondedAt)}</span>}
      </div>

      {state === 'CONFIRMED' && (
        <div className="alert alert-ok"><CircleCheck size={20} /> คุณยืนยันข้อมูลงวดนี้แล้ว รอผู้ดูแลอนุมัติเงินเดือน</div>
      )}
      {state === 'DISPUTED' && (
        <div className="alert alert-warn"><MessageSquareWarning size={20} /> <span>ส่งแจ้งแก้ไขแล้ว: “{conf?.note}” — รอผู้ดูแลตรวจสอบ</span></div>
      )}
      {(state === 'STALE' || state === 'RESOLVED') && (
        <div className="alert alert-warn"><Clock3 size={20} /> ผู้ดูแลปรับข้อมูลแล้ว กรุณาตรวจสอบและยืนยันอีกครั้ง</div>
      )}
      {!open && period.status === 'DRAFT' && (
        <div className="alert alert-warn"><Clock3 size={20} /> ยืนยันได้ตั้งแต่วันที่ {fmtDate(period.endDate)} (วันสุดท้ายของงวด)</div>
      )}

      <div className="stats6">
        {tiles.map(([label, value]) => (
          <div key={label} className="stat-tile"><div className="label">{label}</div><div className="value">{value}</div></div>
        ))}
      </div>
      <div className="card net-row">
        <span className="muted">ยอดรับสุทธิ (ประมาณการ)</span>
        <b>฿{fmtBaht(slip.netPay)}</b>
      </div>

      <MonthCalendar
        today={today}
        days={days.map((d) => ({
          date: d.date, status: d.status, scheduled: d.scheduled, holiday: d.holiday,
          firstIn: d.firstIn?.toISOString() ?? null, lastOut: d.lastOut?.toISOString() ?? null,
          regularMinutes: d.regularMinutes, lateMinutes: d.lateMinutes, otMinutes: d.otMinutes,
          leave: d.leave ? { name: d.leave.name, color: d.leave.color, paid: d.leave.paid } : null,
        }))}
      />

      {open && state !== 'CONFIRMED' && <ConfirmForm periodId={period.id} />}
      {open && state === 'CONFIRMED' && (
        <p className="muted" style={{ textAlign: 'center' }}>ถ้าพบข้อมูลผิดภายหลัง ติดต่อผู้ดูแลได้ก่อนอนุมัติ</p>
      )}
    </main>
  );
}
