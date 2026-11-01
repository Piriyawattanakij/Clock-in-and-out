import Link from 'next/link';
import { Bell } from 'lucide-react';
import { unreadCount } from '@/lib/announcements';

export async function NotificationBell({ user, className = '' }: { user: { id: number; storeId: number | null }; className?: string }) {
  const n = await unreadCount(user);
  return (
    <Link href="/announcements" className={`bell ${className}`} aria-label={n ? `ประกาศ ยังไม่ได้อ่าน ${n} รายการ` : 'ประกาศ'}>
      <Bell size={22} />
      {n > 0 && <span className="bell-badge">{n > 9 ? '9+' : n}</span>}
    </Link>
  );
}
