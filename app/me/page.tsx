import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions/auth';
import { PAY_TYPE_LABEL, type PayType } from '@/lib/payroll';
import { Icon } from '@/components/Icon';
import { BrandLogo } from '@/components/BrandLogo';
import { Avatar } from '@/components/Avatar';
import { PhotoUploader } from '@/components/PhotoUploader';

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const user = await requireUser();
  const [store, shift] = await Promise.all([
    user.storeId ? prisma.store.findUnique({ where: { id: user.storeId } }) : null,
    user.shiftId ? prisma.shift.findUnique({ where: { id: user.shiftId } }) : null,
  ]);
  const rows: [string, string][] = [
    ['รหัสพนักงาน', user.code],
    ['ตำแหน่ง', user.position ?? '-'],
    ['ร้าน / สาขา', store?.name ?? '-'],
    ['กะงาน', shift ? `${shift.name} (${shift.startTime}–${shift.endTime})` : '09:00–18:00'],
    ['ประเภทค่าจ้าง', PAY_TYPE_LABEL[user.payType as PayType]],
    ['เบอร์โทร', user.phone ?? '-'],
  ];
  return (
    <main className="container narrow">
      <div className="card" style={{ textAlign: 'center', paddingTop: 24 }}>
        <PhotoUploader employeeId={user.id} hasPhoto={!!user.photoUpdatedAt}>
          <Avatar emp={user} size={112} className="ring-gold" />
        </PhotoUploader>
        <h1 style={{ margin: '14px 0 0' }}>{user.name}</h1>
        <div className="muted">{user.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</div>
      </div>
      <div className="card" style={{ padding: '4px 16px' }}>
        <table>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}><td className="muted">{k}</td><td className="num" style={{ whiteSpace: 'normal' }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="list" style={{ marginBottom: 16 }}>
        <Link href="/announcements" className="list-item">
          <span className="menu-icon"><Icon name="megaphone" /></span>
          <span className="grow"><b>ประกาศจากร้าน</b></span>
          <Icon name="chevron" className="muted" />
        </Link>
        <Link href="/payslips" className="list-item">
          <span className="menu-icon"><Icon name="receipt" /></span>
          <span className="grow"><b>สลิปเงินเดือน</b></span>
          <Icon name="chevron" className="muted" />
        </Link>
        <Link href="/me/password" className="list-item">
          <span className="menu-icon"><Icon name="key" /></span>
          <span className="grow"><b>เปลี่ยนรหัสผ่าน</b></span>
          <Icon name="chevron" className="muted" />
        </Link>
      </div>
      {user.role === 'ADMIN' && (
        <Link href="/admin/menu" className="list-item" style={{ marginBottom: 16 }}>
          <span className="tile-icon" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            <Icon name="grid" />
          </span>
          <span className="grow"><b>เมนูผู้ดูแลระบบ</b></span>
          <Icon name="chevron" className="muted" />
        </Link>
      )}
      <form action={logoutAction}>
        <button className="btn btn-block btn-danger"><LogOut size={18} /> ออกจากระบบ</button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 28, opacity: 0.85 }}><BrandLogo height={40} /></div>
      <p className="muted" style={{ textAlign: 'center', marginTop: 8 }}>
        เคล็ดลับ: กด “แชร์” → “เพิ่มไปยังหน้าจอโฮม” ในเบราว์เซอร์ เพื่อเปิดเหมือนแอพ
      </p>
    </main>
  );
}
