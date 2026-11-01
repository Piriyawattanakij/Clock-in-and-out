import Link from 'next/link';
import { Camera, LogIn, LogOut, MapPin, Timer } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { buildSessions, nextPunchType } from '@/lib/attendance';
import { addDays, atTime, fmtDate, fmtMinutes, fmtTime, toDateStr } from '@/lib/time';
import { BrandLogo } from '@/components/BrandLogo';
import { Avatar } from '@/components/Avatar';
import { ClockPanel } from './ClockPanel';

export const dynamic = 'force-dynamic';

function greeting(now: Date) {
  const h = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok', hour: 'numeric', hour12: false }));
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

export default async function ClockPage() {
  const user = await requireUser();
  const now = new Date();
  const today = toDateStr(now);
  const [store, last, todays] = await Promise.all([
    user.storeId ? prisma.store.findUnique({ where: { id: user.storeId } }) : null,
    prisma.attendance.findFirst({ where: { employeeId: user.id, voidedAt: null }, orderBy: { timestamp: 'desc' } }),
    prisma.attendance.findMany({
      where: { employeeId: user.id, voidedAt: null, timestamp: { gte: atTime(today, '00:00'), lt: atTime(addDays(today, 1), '00:00') } },
      orderBy: { timestamp: 'asc' },
    }),
  ]);
  const next = nextPunchType(last, now);
  const firstIn = todays.find((a) => a.type === 'IN');
  const lastOut = [...todays].reverse().find((a) => a.type === 'OUT');
  const worked = buildSessions(todays).reduce((m, s) => m + (s.out ? Math.floor((s.out.getTime() - s.in.getTime()) / 60000) : 0), 0);

  return (
    <main className="container narrow">
      <div className="app-bar only-mobile">
        <BrandLogo height={44} />
      </div>
      <section className="hero">
        <div className="row" style={{ alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div className="grow" style={{ flex: 1 }}>
            <div className="muted">{greeting(now)} 👋</div>
            <h1>{user.name}</h1>
            <div className="muted" style={{ marginTop: 2 }}>{fmtDate(now)}</div>
          </div>
          <Link href="/me" className="hero-photo" aria-label="บัญชีของฉัน / เปลี่ยนรูป">
            {user.photoUpdatedAt ? (
              <Avatar emp={user} size={84} className="ring-gold" />
            ) : (
              <>
                <span className="add-photo" style={{ width: 76, height: 76 }}><Camera size={26} /></span>
                <small>เพิ่มรูป</small>
              </>
            )}
          </Link>
        </div>
        {store && (
          <div style={{ marginTop: 14, position: 'relative', zIndex: 1 }}>
            <span className="chip"><MapPin size={14} /> {store.name} · รัศมี {store.radiusM} ม.</span>
          </div>
        )}
      </section>

      {store ? (
        <ClockPanel nextType={next} openSince={next === 'OUT' && last ? last.timestamp.toISOString() : null} />
      ) : (
        <div className="alert alert-warn">คุณยังไม่ได้ถูกกำหนดร้าน กรุณาติดต่อผู้ดูแลระบบ</div>
      )}

      <div className="stats3">
        <div className="stat-tile"><div className="label"><LogIn size={13} /> เข้างาน</div><div className="value">{fmtTime(firstIn?.timestamp)}</div></div>
        <div className="stat-tile"><div className="label"><LogOut size={13} /> ออกงาน</div><div className="value">{fmtTime(lastOut?.timestamp)}</div></div>
        <div className="stat-tile"><div className="label"><Timer size={13} /> รวมวันนี้</div><div className="value">{worked ? fmtMinutes(worked) : '-'}</div></div>
      </div>

      <div className="section-title">
        <h2>กิจกรรมวันนี้</h2>
        <Link href="/history" className="muted">ดูทั้งหมด</Link>
      </div>
      <div className="card">
        {todays.length === 0 ? (
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>ยังไม่มีการตอกเวลาวันนี้</p>
        ) : (
          <ul className="timeline">
            {todays.map((a) => (
              <li key={a.id}>
                <span className={`t-icon ${a.type === 'IN' ? 'in' : 'out'}`}>{a.type === 'IN' ? <LogIn size={18} /> : <LogOut size={18} />}</span>
                <div className="t-main">
                  <div>{a.type === 'IN' ? 'เข้างาน' : 'ออกงาน'}</div>
                  <div className="muted">
                    {a.source === 'MANUAL' ? 'บันทึกโดยผู้ดูแล' : a.distanceM != null ? `ห่างจากร้าน ${Math.round(a.distanceM)} ม.` : 'GPS'}
                  </div>
                </div>
                <span className="t-time">{fmtTime(a.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
