import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pin } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { visibleTo } from '@/lib/announcements';
import { fmtDate, fmtTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const a = await prisma.announcement.findFirst({ where: { id, ...(user.role === 'ADMIN' ? {} : visibleTo(user)) }, include: { store: true } });
  if (!a) notFound();
  // เปิดอ่านแล้ว = อ่านแล้ว
  await prisma.announcementRead.upsert({
    where: { announcementId_employeeId: { announcementId: a.id, employeeId: user.id } },
    update: {},
    create: { announcementId: a.id, employeeId: user.id },
  });
  return (
    <main className="container narrow">
      <Link href="/announcements" className="row muted" style={{ gap: 4, marginBottom: 8 }}><ArrowLeft size={16} /> ประกาศทั้งหมด</Link>
      <article className="card" style={{ padding: 20 }}>
        <div className="row" style={{ gap: 6 }}>
          {a.important && <span className="badge badge-warn"><Pin size={12} /> สำคัญ</span>}
          <span className="muted">{fmtDate(a.createdAt)} {fmtTime(a.createdAt)} น.{a.store ? ` · ${a.store.name}` : ' · ทุกสาขา'}</span>
        </div>
        <h1 style={{ margin: '10px 0 12px' }}>{a.title}</h1>
        <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{a.body}</div>
        {a.expiresAt && <p className="muted" style={{ marginBottom: 0 }}>แสดงถึงวันที่ {fmtDate(a.expiresAt)}</p>}
      </article>
    </main>
  );
}
