import Link from 'next/link';
import { BellOff, Pin } from 'lucide-react';
import { fmtTime } from '@/lib/time';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { visibleTo } from '@/lib/announcements';
import { fmtDate } from '@/lib/time';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const mine = await prisma.notification.findMany({ where: { employeeId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 });
  // เปิดหน้านี้ = อ่านการแจ้งเตือนส่วนตัวแล้ว (ยังแสดงจุดสีในครั้งนี้)
  if (mine.some((m) => !m.readAt)) await prisma.notification.updateMany({ where: { employeeId: user.id, readAt: null }, data: { readAt: new Date() } });
  const items = await prisma.announcement.findMany({
    where: visibleTo(user),
    include: { reads: { where: { employeeId: user.id }, select: { employeeId: true } }, store: true },
    orderBy: [{ important: 'desc' }, { createdAt: 'desc' }],
  });
  return (
    <main className="container narrow">
      <h1>การแจ้งเตือน</h1>
      {mine.length > 0 && (
        <>
          <div className="section-title"><h2>ถึงคุณ</h2></div>
          <div className="list" style={{ marginBottom: 20 }}>
            {mine.map((m) => {
              const inner = (
                <>
                  <div className="grow">
                    <div className="row" style={{ gap: 6 }}>
                      {!m.readAt && <span className="unread-dot" aria-label="ใหม่" />}
                      <span className="sub">{fmtDate(m.createdAt)} {fmtTime(m.createdAt)} น.</span>
                    </div>
                    <b style={{ display: 'block', marginTop: 4 }}>{m.title}</b>
                    {m.body && <div className="sub excerpt">{m.body}</div>}
                  </div>
                  {m.link && <Icon name="chevron" size={18} className="muted" />}
                </>
              );
              return m.link ? (
                <Link key={m.id} href={m.link} className={`list-item announce ${m.readAt ? '' : 'unread'}`}>{inner}</Link>
              ) : (
                <div key={m.id} className={`list-item announce ${m.readAt ? '' : 'unread'}`}>{inner}</div>
              );
            })}
          </div>
        </>
      )}
      <div className="section-title"><h2>ประกาศจากร้าน</h2></div>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <BellOff size={40} className="muted" />
          <p className="muted">ยังไม่มีประกาศ</p>
        </div>
      ) : (
        <div className="list">
          {items.map((a) => {
            const unread = a.reads.length === 0;
            return (
              <Link key={a.id} href={`/announcements/${a.id}`} className={`list-item announce ${unread ? 'unread' : ''}`}>
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    {unread && <span className="unread-dot" aria-label="ยังไม่ได้อ่าน" />}
                    {a.important && <span className="badge badge-warn"><Pin size={12} /> สำคัญ</span>}
                    <span className="sub">{fmtDate(a.createdAt)}{a.store ? ` · ${a.store.name}` : ''}</span>
                  </div>
                  <b style={{ display: 'block', marginTop: 4 }}>{a.title}</b>
                  <div className="sub excerpt">{a.body}</div>
                </div>
                <Icon name="chevron" size={18} className="muted" />
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
