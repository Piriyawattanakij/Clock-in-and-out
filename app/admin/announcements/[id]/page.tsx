import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { deleteAnnouncementAction } from '@/app/admin/actions';
import { audienceWhere } from '@/lib/announcements';
import { fmtDateTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { Flash } from '@/components/Flash';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { AnnouncementForm } from '../AnnouncementForm';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const a = Number.isInteger(id) ? await prisma.announcement.findUnique({ where: { id }, include: { reads: true } }) : null;
  if (!a) notFound();
  const [stores, audience] = await Promise.all([
    prisma.store.findMany(),
    prisma.employee.findMany({ where: audienceWhere(a), orderBy: { code: 'asc' } }),
  ]);
  const readAt = new Map(a.reads.map((r) => [r.employeeId, r.readAt]));
  const read = audience.filter((e) => readAt.has(e.id));
  const unread = audience.filter((e) => !readAt.has(e.id));

  return (
    <main className="container narrow" style={{ maxWidth: 760 }}>
      <Link href="/admin/announcements">← ประกาศทั้งหมด</Link>
      <h1>แก้ไขประกาศ</h1>
      <Flash {...sp} />
      <AnnouncementForm a={a} stores={stores} />

      <h2>อ่านแล้ว {read.length}/{audience.length} คน</h2>
      <div className="card">
        {unread.length > 0 && (
          <>
            <div className="muted" style={{ marginBottom: 8 }}>ยังไม่ได้อ่าน ({unread.length})</div>
            <div className="row" style={{ marginBottom: 16 }}>
              {unread.map((e) => <span key={e.id} className="chip"><Avatar emp={e} size={22} /> {e.name}</span>)}
            </div>
          </>
        )}
        <div className="muted" style={{ marginBottom: 8 }}>อ่านแล้ว ({read.length})</div>
        {read.length === 0 ? <p className="muted" style={{ margin: 0 }}>ยังไม่มีใครอ่าน</p> : (
          <table>
            <tbody>
              {read.map((e) => (
                <tr key={e.id}>
                  <td><span className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><Avatar emp={e} size={28} />{e.name}</span></td>
                  <td className="num muted">{fmtDateTime(readAt.get(e.id)!)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form action={deleteAnnouncementAction} style={{ marginTop: 8 }}>
        <input type="hidden" name="id" value={a.id} />
        <ConfirmSubmit className="btn btn-danger" message="ลบประกาศนี้? (ลบแล้วกู้คืนไม่ได้)">ลบประกาศนี้</ConfirmSubmit>
      </form>
    </main>
  );
}
