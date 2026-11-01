'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, Send } from 'lucide-react';
import { requestLeaveAction } from '@/app/actions/leave';

export function LeaveRequestForm({ types, today }: { types: { id: number; name: string; color: string; note: string }[]; today: string }) {
  const [state, action, pending] = useActionState(requestLeaveAction, undefined);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="card" style={{ display: 'grid', gap: 12 }}>
      <div className="leave-types">
        {types.map((t, i) => (
          <label key={t.id} className="leave-type-option">
            <input type="radio" name="leaveTypeId" value={t.id} defaultChecked={i === 0} required />
            <span className="leave-type-pill" style={{ ['--c' as string]: t.color }}>
              <b>{t.name}</b>
              <small>{t.note}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="grid grid-2">
        <label>ตั้งแต่วันที่
          <input type="date" name="startDate" value={start} required onChange={(e) => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} />
        </label>
        <label>ถึงวันที่
          <input type="date" name="endDate" value={end} min={start} required onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label>เหตุผล (ไม่บังคับ)<textarea name="reason" rows={3} maxLength={500} placeholder="เช่น ไม่สบาย มีไข้" style={{ minHeight: 80 }} /></label>
      {state?.error && <div className="alert alert-err" style={{ margin: 0 }}><CircleAlert size={20} /> {state.error}</div>}
      {state?.ok && <div className="alert alert-ok" style={{ margin: 0 }}><CircleCheck size={20} /> {state.message}</div>}
      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? <><LoaderCircle size={18} className="spin" /> กำลังส่ง…</> : <><Send size={18} /> ส่งคำขอลา</>}
      </button>
      <p className="muted" style={{ margin: 0 }}>ระบบนับเฉพาะวันทำงาน (ไม่นับวันหยุดประจำสัปดาห์และวันหยุดนักขัตฤกษ์)</p>
    </form>
  );
}
