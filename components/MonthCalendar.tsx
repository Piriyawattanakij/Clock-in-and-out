'use client';

import { useState } from 'react';
import { LogIn, LogOut, Timer } from 'lucide-react';

export interface CalDay {
  date: string;
  status: 'PRESENT' | 'INCOMPLETE' | 'ABSENT' | 'LEAVE' | 'OFF' | 'PENDING';
  scheduled: boolean;
  holiday: boolean;
  firstIn: string | null;
  lastOut: string | null;
  regularMinutes: number;
  lateMinutes: number;
  otMinutes: number;
  leave: { name: string; color: string; paid: boolean } | null;
}

const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const t = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '-');
const hm = (m: number) => (!m ? '-' : m >= 60 ? `${Math.floor(m / 60)} ชม.${m % 60 ? ` ${m % 60} น.` : ''}` : `${m} น.`);
const wd = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

function kind(d: CalDay, today: string) {
  if (d.status === 'LEAVE') return 'leave';
  if (d.status === 'ABSENT') return 'absent';
  if (d.status === 'INCOMPLETE') return d.date === today ? 'working' : 'incomplete';
  if (d.status === 'PRESENT') return d.lateMinutes > 0 ? 'late' : 'ok';
  if (d.status === 'OFF') return d.holiday ? 'holiday' : 'off';
  return 'future';
}

const LABEL: Record<string, string> = {
  ok: 'มาทำงาน', late: 'มาสาย', absent: 'ขาดงาน', incomplete: 'ไม่ได้บันทึกออก', working: 'กำลังทำงาน',
  holiday: 'วันหยุดนักขัตฤกษ์', off: 'วันหยุด', future: 'ยังไม่ถึง', leave: 'ลา',
};

export function MonthCalendar({ days, today }: { days: CalDay[]; today: string }) {
  const initial = days.find((d) => d.date === today)?.date ?? [...days].reverse().find((d) => d.date <= today)?.date ?? days[0]?.date;
  const [sel, setSel] = useState(initial);
  const lead = days.length ? wd(days[0].date) : 0;
  const d = days.find((x) => x.date === sel);

  return (
    <div className="card cal-card">
      <div className="cal-grid cal-head">{WD.map((w, i) => <span key={w} className={i === 0 ? 'sun' : ''}>{w}</span>)}</div>
      <div className="cal-grid">
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {days.map((x) => {
          const k = kind(x, today);
          return (
            <button
              key={x.date}
              type="button"
              className={`cal-day k-${k} ${x.date === today ? 'is-today' : ''} ${x.date === sel ? 'is-sel' : ''}`}
              style={x.leave ? { ['--c' as string]: x.leave.color } : undefined}
              onClick={() => setSel(x.date)}
              aria-label={`${Number(x.date.slice(8))} ${LABEL[k]}`}
              aria-pressed={x.date === sel}
            >
              <span className="n">{Number(x.date.slice(8))}</span>
              {x.otMinutes > 0 && <i className="ot-dot" />}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><i className="k-ok" />มาทำงาน</span>
        <span><i className="k-late" />สาย</span>
        <span><i className="k-absent" />ขาด</span>
        <span><i className="k-leave-sw" />ลา</span>
        <span><i className="k-holiday" />วันหยุด</span>
        <span><i className="ot-dot static" />OT</span>
      </div>

      {d && (() => {
        const k = kind(d, today);
        return (
          <div className="cal-detail">
            <div className="row" style={{ gap: 8 }}>
              <b>{new Date(`${d.date}T12:00:00+07:00`).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Bangkok' })}</b>
              <span className={`badge cal-badge k-${k}`} style={d.leave ? { ['--c' as string]: d.leave.color } : undefined}>
                {d.leave ? `${d.leave.name}${d.leave.paid ? '' : ' (ไม่รับเงิน)'}` : LABEL[k]}
              </span>
            </div>
            {(d.firstIn || d.lastOut) && (
              <div className="cal-stats">
                <div><span><LogIn size={13} /> เข้า</span><b>{t(d.firstIn)}</b></div>
                <div><span><LogOut size={13} /> ออก</span><b>{t(d.lastOut)}</b></div>
                <div><span><Timer size={13} /> ทำงาน</span><b>{hm(d.regularMinutes)}</b></div>
              </div>
            )}
            {(d.lateMinutes > 0 || d.otMinutes > 0) && (
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                {d.lateMinutes > 0 && <span className="badge badge-err">สาย {hm(d.lateMinutes)}</span>}
                {d.otMinutes > 0 && <span className="badge badge-warn">OT {hm(d.otMinutes)}</span>}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
