import Link from 'next/link';
import { Pin } from 'lucide-react';
import { prisma } from '@/lib/db';
import { audienceWhere } from '@/lib/announcements';
import { fmtDate, toDateStr } from '@/lib/time';
import { Flash } from '@/components/Flash';
import { AnnouncementForm } from './AnnouncementForm';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const today = toDateStr(new Date());
  const [stores, items] = await Promise.all([
    prisma.store.findMany(),
    prisma.announcement.findMany({ include: { store: true, _count: { select: { reads: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);
  const audience = await Promise.all(items.map((a) => prisma.employee.count({ where: audienceWhere(a) })));

  return (
    <main className="container narrow" style={{ maxWidth: 760 }}>
      <h1>ประกาศ</h1>
      <Flash {...sp} />
      <h2>สร้างประกาศใหม่</h2>
      <AnnouncementForm stores={stores} />
      <h2>ประกาศทั้งหมด</h2>
      <div className="list">
        {items.length === 0 && <p className="muted">ยังไม่มีประกาศ</p>}
        {items.map((a, i) => {
          const expired = a.expiresAt !== null && a.expiresAt < today;
          return (
            <Link key={a.id} href={`/admin/announcements/${a.id}`} className={`list-item ${expired ? 'dim' : ''}`}>
              <div className="grow">
                <div className="row" style={{ gap: 6 }}>
                  {a.important && <span className="badge badge-warn"><Pin size={12} /> สำคัญ</span>}
                  {expired && <span className="badge">หมดอายุแล้ว</span>}
                  <span className="sub">{fmtDate(a.createdAt)} · {a.store?.name ?? 'ทุกสาขา'}</span>
                </div>
                <b style={{ display: 'block', marginTop: 4 }}>{a.title}</b>
              </div>
              <div className="amount" style={{ fontWeight: 500, fontSize: 14 }}>อ่านแล้ว {Math.min(a._count.reads, audience[i])}/{audience[i]}</div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
