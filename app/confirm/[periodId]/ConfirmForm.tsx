'use client';

import { useActionState, useState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, MessageSquareWarning } from 'lucide-react';
import { confirmPeriodAction } from '@/app/actions/confirm';

export function ConfirmForm({ periodId }: { periodId: number }) {
  const [state, action, pending] = useActionState(confirmPeriodAction, undefined);
  const [dispute, setDispute] = useState(false);
  if (state?.ok) return null; // หน้าโหลดใหม่และแสดงสถานะล่าสุดแทน
  return (
    <form action={action} className="card" style={{ display: 'grid', gap: 12 }}>
      <input type="hidden" name="periodId" value={periodId} />
      <input type="hidden" name="decision" value={dispute ? 'DISPUTED' : 'CONFIRMED'} />
      {dispute ? (
        <>
          <label>ข้อมูลไหนไม่ถูกต้อง *
            <textarea name="note" rows={4} required maxLength={1000} placeholder="เช่น วันที่ 12 ลืมบันทึกออก ออกงานจริง 18:00 น." style={{ minHeight: 100 }} />
          </label>
          <div className="row">
            <button className="btn btn-danger" disabled={pending}>
              {pending ? <LoaderCircle size={18} className="spin" /> : <MessageSquareWarning size={18} />} ส่งแจ้งแก้ไข
            </button>
            <button type="button" className="btn" onClick={() => setDispute(false)}>ยกเลิก</button>
          </div>
        </>
      ) : (
        <>
          <button className="btn btn-block btn-approve" disabled={pending}>
            {pending ? <LoaderCircle size={18} className="spin" /> : <CircleCheck size={18} />} ยืนยันว่าข้อมูลถูกต้อง
          </button>
          <button type="button" className="btn btn-block" onClick={() => setDispute(true)}>
            <MessageSquareWarning size={18} /> มีข้อมูลไม่ถูกต้อง แจ้งแก้ไข
          </button>
        </>
      )}
      {state?.error && <div className="alert alert-err" style={{ margin: 0 }}><CircleAlert size={20} /> {state.error}</div>}
    </form>
  );
}
