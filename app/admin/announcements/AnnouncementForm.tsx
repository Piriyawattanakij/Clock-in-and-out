import type { Announcement, Store } from '@prisma/client';
import { saveAnnouncementAction } from '@/app/admin/actions';

export function AnnouncementForm({ a, stores }: { a?: Announcement; stores: Store[] }) {
  return (
    <form action={saveAnnouncementAction} className="card" style={{ display: 'grid', gap: 12 }}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <label>หัวข้อ *<input name="title" defaultValue={a?.title} maxLength={120} required placeholder="เช่น เปลี่ยนเวลาเข้างานวันเสาร์นี้" /></label>
      <label>รายละเอียด *<textarea name="body" defaultValue={a?.body} rows={6} maxLength={5000} required /></label>
      <div className="grid">
        <label>ส่งถึง
          <select name="storeId" defaultValue={a?.storeId ?? ''}>
            <option value="">ทุกสาขา</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>แสดงถึงวันที่ (ไม่บังคับ)<input type="date" name="expiresAt" defaultValue={a?.expiresAt ?? ''} /></label>
      </div>
      <label className="check"><input type="checkbox" name="important" defaultChecked={a?.important} /> สำคัญ — ปักหมุดไว้บนสุด</label>
      <div><button className="btn btn-primary">{a ? 'บันทึกการแก้ไข' : 'ประกาศ'}</button></div>
    </form>
  );
}
