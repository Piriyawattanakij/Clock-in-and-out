import 'server-only';
import { prisma } from './db';
import { canConfirm, confirmState, needsStaffAction, slipSnapshot, type ConfirmState } from './confirmation';
import { toDateStr } from './time';

/** งวดที่เป็นร่างซึ่งพนักงานคนนี้มีสลิป พร้อมสถานะการยืนยัน */
export async function myDraftPeriods(employeeId: number) {
  const today = toDateStr(new Date());
  const slips = await prisma.payslip.findMany({
    where: { employeeId, period: { status: 'DRAFT' } },
    include: { period: { include: { confirmations: { where: { employeeId } } } } },
    orderBy: { period: { endDate: 'desc' } },
  });
  return slips.map((s) => {
    const state: ConfirmState = confirmState(s.period.confirmations[0], slipSnapshot(s));
    const open = canConfirm(s.period, today);
    return { period: s.period, state, open, actionNeeded: open && needsStaffAction(state) };
  });
}
