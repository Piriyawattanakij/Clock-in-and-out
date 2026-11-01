import Link from 'next/link';
import { ADMIN_LINKS } from '@/lib/nav';
import { Icon } from '@/components/Icon';

export default function AdminMenuPage() {
  return (
    <main className="container narrow">
      <h1>จัดการร้าน</h1>
      <div className="tiles">
        {ADMIN_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="tile">
            <span className="tile-icon"><Icon name={l.icon} size={22} /></span>
            <b>{l.label}</b>
            <span>{l.desc}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
