import type { Employee, Shift, Store } from '@prisma/client';
import { saveEmployeeAction } from '@/app/admin/actions';
import { toBahtInput } from '@/lib/money';

export function EmployeeForm({ emp, stores, shifts }: { emp?: Employee; stores: Store[]; shifts: Shift[] }) {
  return (
    <form action={saveEmployeeAction} className="card">
      {emp && <input type="hidden" name="id" value={emp.id} />}
      <h2 style={{ marginTop: 0 }}>ข้อมูลทั่วไป</h2>
      <div className="grid">
        <label>รหัสพนักงาน *<input name="code" defaultValue={emp?.code} required /></label>
        <label>ชื่อ-นามสกุล *<input name="name" defaultValue={emp?.name} required /></label>
        <label>เบอร์โทร<input name="phone" defaultValue={emp?.phone ?? ''} /></label>
        <label>ตำแหน่ง<input name="position" defaultValue={emp?.position ?? ''} /></label>
        <label>ร้าน / สาขา
          <select name="storeId" defaultValue={emp?.storeId ?? stores[0]?.id ?? ''}>
            <option value="">— ไม่ระบุ —</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>กะงาน
          <select name="shiftId" defaultValue={emp?.shiftId ?? shifts[0]?.id ?? ''}>
            <option value="">— ค่าเริ่มต้น (09:00–18:00 จ.–ส.) —</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
          </select>
        </label>
        <label>วันเริ่มงาน<input name="startDate" type="date" defaultValue={emp?.startDate ?? new Date().toISOString().slice(0, 10)} /></label>
        <label>สิทธิ์
          <select name="role" defaultValue={emp?.role ?? 'STAFF'}>
            <option value="STAFF">พนักงาน</option>
            <option value="ADMIN">ผู้ดูแลระบบ</option>
          </select>
        </label>
        <label>{emp ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน *'}
          <input name="password" type="password" autoComplete="new-password" required={!emp} minLength={4} />
        </label>
      </div>
      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" name="active" defaultChecked={emp?.active ?? true} /> เปิดใช้งาน
      </label>

      <h2>เงินเดือน</h2>
      <div className="grid">
        <label>ประเภทค่าจ้าง
          <select name="payType" defaultValue={emp?.payType ?? 'MONTHLY'}>
            <option value="MONTHLY">รายเดือน</option>
            <option value="DAILY">รายวัน</option>
            <option value="HOURLY">รายชั่วโมง</option>
          </select>
        </label>
        <label>ฐานค่าจ้าง (บาท / เดือน·วัน·ชม.)<input name="baseSalary" type="number" step="0.01" min="0" defaultValue={toBahtInput(emp?.baseSalary ?? 0)} /></label>
        <label>เบี้ยเลี้ยงประจำ (บาท/เดือน)<input name="allowance" type="number" step="0.01" min="0" defaultValue={toBahtInput(emp?.allowance ?? 0)} /></label>
        <label>ค่าลดหย่อนภาษีเพิ่มเติม (บาท/ปี)<input name="taxDeduction" type="number" step="0.01" min="0" defaultValue={toBahtInput(emp?.taxDeduction ?? 0)} /></label>
        <label>ธนาคาร<input name="bankName" defaultValue={emp?.bankName ?? ''} /></label>
        <label>เลขบัญชี<input name="bankAccount" defaultValue={emp?.bankAccount ?? ''} /></label>
        <label>เลขประจำตัวผู้เสียภาษี<input name="taxId" defaultValue={emp?.taxId ?? ''} /></label>
      </div>
      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" name="socialSecurity" defaultChecked={emp?.socialSecurity ?? true} /> หักประกันสังคม
      </label>
      <p className="muted">พนักงานที่ฐานค่าจ้างเป็น 0 จะไม่ถูกนำไปคำนวณเงินเดือน</p>
      <button className="btn btn-primary">บันทึก</button>
    </form>
  );
}
