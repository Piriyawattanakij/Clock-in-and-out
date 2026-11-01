import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ADMIN_LINKS } from '@/lib/nav';
import { Icon } from '@/components/Icon';

export default async function AdminMenuPage() {
  const pendingLeave = await prisma.leaveRequest.count({ where: { status: 'PENDING' } });
  const badges: Record<string, number> = { '/admin/leave': pendingLeave };
  return (
    <main className="container narrow">
      <h1>จัดการร้าน</h1>
      <div className="tiles">
        {ADMIN_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="tile">
            <span className="tile-icon" style={{ position: 'relative' }}>
              <Icon name={l.icon} size={22} />
              {badges[l.href] ? <span className="bell-badge">{badges[l.href]}</span> : null}
            </span>
            <b>{l.label}</b>
            <span>{l.desc}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
