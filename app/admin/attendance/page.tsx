import Link from 'next/link';
import { prisma } from '@/lib/db';
import { addManualAttendanceAction, voidAttendanceAction } from '@/app/admin/actions';
import { addDays, atTime, fmtDate, fmtTime, isValidDateStr, toDateStr, toLocalInput } from '@/lib/time';
import { Flash } from '@/components/Flash';

export const dynamic = 'force-dynamic';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; employeeId?: string; ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date && isValidDateStr(sp.date) ? sp.date : toDateStr(new Date());
  const employeeId = Number(sp.employeeId) || undefined;
  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
    prisma.attendance.findMany({
      where: { employeeId, timestamp: { gte: atTime(date, '00:00'), lt: atTime(addDays(date, 1), '00:00') } },
      include: { employee: true },
      orderBy: { timestamp: 'asc' },
    }),
  ]);
  const names = new Map(employees.map((e) => [e.id, e.name]));

  return (
    <main className="container">
      <h1>บันทึกเวลาเข้า-ออก — {fmtDate(date)}</h1>
      <Flash ok={sp.ok} error={sp.error} />
      <form className="card row" method="get">
        <Link className="btn btn-sm" href={`?date=${addDays(date, -1)}`}>←</Link>
        <input type="date" name="date" defaultValue={date} style={{ width: 'auto' }} />
        <Link className="btn btn-sm" href={`?date=${addDays(date, 1)}`}>→</Link>
        <select name="employeeId" defaultValue={employeeId ?? ''} style={{ width: 'auto' }}>
          <option value="">พนักงานทุกคน</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.code} {e.name}</option>)}
        </select>
        <button className="btn">แสดง</button>
      </form>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>เวลา</th><th>พนักงาน</th><th>ประเภท</th><th>ที่มา</th><th className="num">ระยะ</th><th className="num">GPS ±</th><th>หมายเหตุ</th><th></th></tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan={8} className="muted">ไม่มีรายการ</td></tr>}
            {records.map((a) => (
              <tr key={a.id} style={a.voidedAt ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
                <td>{fmtTime(a.timestamp)}</td>
                <td>{a.employee.code} {a.employee.name}</td>
                <td><span className={`badge ${a.type === 'IN' ? 'badge-ok' : 'badge-err'}`}>{a.type === 'IN' ? 'เข้า' : 'ออก'}</span></td>
                <td>
                  {a.source === 'MANUAL' ? (
                    <span className="badge badge-warn">เพิ่มโดย {names.get(a.createdById ?? 0) ?? 'ผู้ดูแล'}</span>
                  ) : a.latitude != null ? (
                    <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}>GPS 🗺</a>
                  ) : 'GPS'}
                </td>
                <td className="num">{a.distanceM != null ? `${Math.round(a.distanceM)} ม.` : '-'}</td>
                <td className="num">{a.accuracyM != null ? `${Math.round(a.accuracyM)} ม.` : '-'}</td>
                <td style={{ whiteSpace: 'normal' }}>
                  {a.note}
                  {a.voidedAt && <div className="muted">ยกเลิกโดย {names.get(a.voidedById ?? 0) ?? 'ผู้ดูแล'}: {a.voidNote}</div>}
                </td>
                <td>
                  {!a.voidedAt && (
                    <form action={voidAttendanceAction} className="row" style={{ flexWrap: 'nowrap' }}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="backDate" value={date} />
                      <input name="voidNote" placeholder="เหตุผล" required style={{ width: 120 }} />
                      <button className="btn btn-sm btn-danger">ยกเลิก</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>เพิ่มเวลาด้วยตนเอง (กรณีพนักงานลืมบันทึก)</h2>
      <form action={addManualAttendanceAction} className="card">
        <input type="hidden" name="backDate" value={date} />
        <div className="grid">
          <label>พนักงาน
            <select name="employeeId" defaultValue={employeeId ?? ''} required>
              <option value="" disabled>— เลือก —</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.code} {e.name}</option>)}
            </select>
          </label>
          <label>ประเภท
            <select name="type"><option value="IN">เข้า</option><option value="OUT">ออก</option></select>
          </label>
          <label>วันเวลา<input type="datetime-local" name="timestamp" defaultValue={toLocalInput(atTime(date, '09:00'))} required /></label>
          <label>เหตุผล *<input name="note" placeholder="เช่น ลืมบันทึกออก แจ้งทางไลน์" required /></label>
        </div>
        <p className="muted">ทุกรายการที่เพิ่มหรือยกเลิกจะบันทึกชื่อผู้ดูแลและเหตุผลไว้เสมอ</p>
        <button className="btn btn-primary">เพิ่มรายการ</button>
      </form>
    </main>
  );
}
