import type { Shift } from '@prisma/client';
import { prisma } from '@/lib/db';
import { addHolidayAction, deleteHolidayAction, saveShiftAction } from '@/app/admin/actions';
import { parseWorkDays } from '@/lib/attendance';
import { fmtDate } from '@/lib/time';
import { Flash } from '@/components/Flash';

export const dynamic = 'force-dynamic';

const DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function ShiftForm({ shift }: { shift?: Shift }) {
  const days = parseWorkDays(shift?.workDays ?? '1,2,3,4,5,6');
  return (
    <form action={saveShiftAction} className="card">
      {shift && <input type="hidden" name="id" value={shift.id} />}
      <h2 style={{ marginTop: 0 }}>{shift ? shift.name : 'เพิ่มกะใหม่'}</h2>
      <div className="grid">
        <label>ชื่อกะ *<input name="name" defaultValue={shift?.name} required /></label>
        <label>เวลาเริ่ม<input name="startTime" type="time" defaultValue={shift?.startTime ?? '09:00'} required /></label>
        <label>เวลาเลิก<input name="endTime" type="time" defaultValue={shift?.endTime ?? '18:00'} required /></label>
        <label>พัก (นาที)<input name="breakMinutes" type="number" min={0} defaultValue={shift?.breakMinutes ?? 60} /></label>
        <label>สายได้ไม่เกิน (นาที) โดยไม่นับสาย<input name="lateGraceMinutes" type="number" min={0} defaultValue={shift?.lateGraceMinutes ?? 5} /></label>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <span className="muted">วันทำงาน:</span>
        {DAYS.map((d, i) => (
          <label key={i} className="check">
            <input type="checkbox" name="workDays" value={i} defaultChecked={days.includes(i)} /> {d}
          </label>
        ))}
      </div>
      <p className="muted">ถ้าเวลาเลิกน้อยกว่าเวลาเริ่ม (เช่น 22:00–06:00) ระบบจะถือเป็นกะข้ามวัน</p>
      <button className="btn btn-primary">บันทึก</button>
    </form>
  );
}

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const [shifts, holidays, stores] = await Promise.all([
    prisma.shift.findMany({ orderBy: { id: 'asc' } }),
    prisma.holiday.findMany({ orderBy: { date: 'asc' }, include: { store: true } }),
    prisma.store.findMany(),
  ]);
  return (
    <main className="container">
      <h1>กะงาน และวันหยุด</h1>
      <Flash {...sp} />
      {shifts.map((s) => <ShiftForm key={s.id} shift={s} />)}
      <ShiftForm />

      <h2>วันหยุดนักขัตฤกษ์ / วันหยุดร้าน</h2>
      <div className="card">
        <form action={addHolidayAction} className="row">
          <input type="date" name="date" required style={{ width: 'auto' }} />
          <input name="name" placeholder="ชื่อวันหยุด" required style={{ width: 'auto', flex: 1 }} />
          <select name="storeId" style={{ width: 'auto' }}>
            <option value="">ทุกสาขา</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary">เพิ่ม</button>
        </form>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td>{fmtDate(h.date)}</td>
                  <td>{h.name}</td>
                  <td className="muted">{h.store?.name ?? 'ทุกสาขา'}</td>
                  <td className="num">
                    <form action={deleteHolidayAction}>
                      <input type="hidden" name="id" value={h.id} />
                      <button className="btn btn-sm btn-danger">ลบ</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
