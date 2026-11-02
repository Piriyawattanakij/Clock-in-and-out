'use client';

import { useActionState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { requestRedemptionAction } from '@/app/actions/rewards';

export function RedeemForm({ balance, min }: { balance: number; min: number }) {
  const [state, action, pending] = useActionState(requestRedemptionAction, undefined);
  if (state?.ok) return <div className="alert alert-ok" style={{ position: 'relative', zIndex: 1 }}><CircleCheck size={20} /> ส่งคำขอแลกแล้ว รอผู้ดูแลอนุมัติ</div>;
  const can = balance >= min;
  return (
    <>
      <form action={action}>
        <input name="amount" type="number" inputMode="decimal" min={min / 100} max={balance / 100} step="1" defaultValue={can ? balance / 100 : ''} placeholder={`ขั้นต่ำ ${min / 100} บาท`} disabled={!can} aria-label="จำนวนเงินที่ต้องการแลก (บาท)" />
        <button className="btn btn-redeem" disabled={!can || pending}>{pending ? <LoaderCircle size={18} className="spin" /> : '🐷'} แลกเป็นเงิน</button>
      </form>
      {!can && <div className="muted" style={{ marginTop: 8, position: 'relative', zIndex: 1 }}>สะสมครบ {min / 100} บาทแล้วแลกได้ — ไม่ต้องรีบ เก็บไว้แลกเป็นก้อนทีหลังได้</div>}
      {state?.error && <div className="alert alert-err" style={{ position: 'relative', zIndex: 1 }}><CircleAlert size={20} /> {state.error}</div>}
    </>
  );
}
