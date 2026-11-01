'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { navItems } from '@/lib/nav';

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = navItems(isAdmin);
  // /admin/* ทั้งหมดให้ไฮไลต์ที่แท็บ "จัดการ"
  const active = (href: string) => (href === '/admin/menu' ? path.startsWith('/admin') : path === href || path.startsWith(href + '/'));
  return (
    <nav className="bottom" aria-label="เมนูหลัก">
      <div className="tabs">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={active(it.href) ? 'active' : ''}>
            <span className="tab-icon"><Icon name={it.icon} size={22} /></span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
