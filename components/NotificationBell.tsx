import Link from 'next/link';
import { Bell } from 'lucide-react';
import { prisma } from '@/lib/db';
import { unreadCount } from '@/lib/announcements';

export async function NotificationBell({ user, className = '' }: { user: { id: number; storeId: number | null }; className?: string }) {
  const [a, p] = await Promise.all([unreadCount(user), prisma.notification.count({ where: { employeeId: user.id, readAt: null } })]);
  const n = a + p;
  return (
    <Link href="/announcements" className={`bell ${className}`} aria-label={n ? `การแจ้งเตือน ยังไม่ได้อ่าน ${n} รายการ` : 'การแจ้งเตือน'}>
      <Bell size={22} />
      {n > 0 && <span className="bell-badge">{n > 9 ? '9+' : n}</span>}
    </Link>
  );
}
