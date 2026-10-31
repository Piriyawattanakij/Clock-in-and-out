import { STATUS_LABEL, type DaySummary } from '@/lib/attendance';
import { fmtDate, fmtMinutes, fmtTime } from '@/lib/time';

const BADGE: Record<string, string> = {
  PRESENT: 'badge-ok',
  INCOMPLETE: 'badge-warn',
  ABSENT: 'badge-err',
  OFF: '',
  PENDING: '',
};

export function DaysTable({ days }: { days: DaySummary[] }) {
  const total = (k: 'regularMinutes' | 'lateMinutes' | 'otMinutes') => days.reduce((a, d) => a + d[k], 0);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>สถานะ</th>
            <th>เข้า</th>
            <th>ออก</th>
            <th className="num">ทำงาน</th>
            <th className="num">สาย</th>
            <th className="num">OT</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{fmtDate(d.date)}</td>
              <td>
                <span className={`badge ${BADGE[d.status]}`}>
                  {d.status === 'OFF' && d.holiday ? 'วันหยุดนักขัตฤกษ์' : STATUS_LABEL[d.status]}
                </span>
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
  );
}
