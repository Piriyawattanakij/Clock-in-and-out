import { STATUS_LABEL, type DaySummary } from '@/lib/attendance';
import { fmtDate, fmtMinutes, fmtTime, toDateStr, weekday } from '@/lib/time';

const BADGE: Record<string, string> = {
  PRESENT: 'badge-ok',
  INCOMPLETE: 'badge-warn',
  ABSENT: 'badge-err',
  OFF: '',
  PENDING: '',
};
const WD = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function statusLabel(d: DaySummary, today: string) {
  if (d.date === today && d.status === 'INCOMPLETE') return 'กำลังทำงาน';
  if (d.date === today && d.status === 'PENDING') return 'วันนี้';
  return d.status === 'OFF' && d.holiday ? 'วันหยุดนักขัตฤกษ์' : STATUS_LABEL[d.status];
}
function badgeClass(d: DaySummary, today: string) {
  return d.date === today && d.status === 'INCOMPLETE' ? 'badge-ok' : BADGE[d.status];
}

/** ตาราง (คอมพิวเตอร์) + การ์ดรายวัน (มือถือ) */
export function DaysTable({ days }: { days: DaySummary[] }) {
  const total = (k: 'regularMinutes' | 'lateMinutes' | 'otMinutes') => days.reduce((a, d) => a + d[k], 0);
  const today = toDateStr(new Date());
  // มือถือ: ล่าสุดอยู่บน และซ่อนวันในอนาคต
  const mobileDays = days.filter((d) => d.date <= today).reverse();

  return (
    <>
      <div className="card table-wrap only-desktop">
        <table>
          <thead>
            <tr>
              <th>วันที่</th><th>สถานะ</th><th>เข้า</th><th>ออก</th>
              <th className="num">ทำงาน</th><th className="num">สาย</th><th className="num">OT</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td>{fmtDate(d.date)}</td>
                <td>
                  <span className={`badge ${badgeClass(d, today)}`}>{statusLabel(d, today)}</span>
                  {!d.scheduled && d.workedMinutes > 0 && <span className="badge badge-warn" style={{ marginLeft: 4 }}>ทำงานวันหยุด</span>}
                </td>
                <td>{fmtTime(d.firstIn)}</td>
                <td>{fmtTime(d.lastOut)}</td>
                <td className="num">{fmtMinutes(d.regularMinutes)}</td>
                <td className="num">{fmtMinutes(d.lateMinutes)}</td>
                <td className="num">{fmtMinutes(d.otMinutes)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={4}>รวม</th>
              <th className="num">{fmtMinutes(total('regularMinutes'))}</th>
              <th className="num">{fmtMinutes(total('lateMinutes'))}</th>
              <th className="num">{fmtMinutes(total('otMinutes'))}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="list only-mobile">
        {mobileDays.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>ยังไม่มีข้อมูลเดือนนี้</p>}
        {mobileDays.map((d) => {
          const off = d.status === 'OFF' || d.status === 'PENDING';
          return (
            <div key={d.date} className={`list-item ${off && !d.firstIn ? 'dim' : ''}`}>
              <div className={`date-block ${d.date === today ? 'today' : ''}`}>
                <b>{Number(d.date.slice(8))}</b>
                <span>{WD[weekday(d.date)]}</span>
              </div>
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  <span className={`badge ${badgeClass(d, today)}`}>{statusLabel(d, today)}</span>
                  {d.lateMinutes > 0 && <span className="badge badge-err">สาย {fmtMinutes(d.lateMinutes)}</span>}
                  {d.otMinutes > 0 && <span className="badge badge-warn">OT {fmtMinutes(d.otMinutes)}</span>}
                </div>
                {d.firstIn && (
                  <div className="sub" style={{ marginTop: 4 }}>
                    {fmtTime(d.firstIn)} – {fmtTime(d.lastOut)}
                  </div>
                )}
              </div>
              {d.regularMinutes > 0 && <div className="amount">{fmtMinutes(d.regularMinutes)}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
