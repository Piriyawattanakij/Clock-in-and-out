export interface NavItem {
  href: string;
  label: string;
  icon: 'clock' | 'history' | 'receipt' | 'grid' | 'user' | 'leave';
}

export function navItems(isAdmin: boolean): NavItem[] {
  return [
    { href: '/clock', label: 'บันทึกเวลา', icon: 'clock' },
    { href: '/history', label: 'ประวัติ', icon: 'history' },
    { href: '/leave', label: 'ลา', icon: 'leave' },
    // ผู้ดูแล: แท็บ "จัดการ" แทน "สลิป" (สลิปของตัวเองเปิดได้จากหน้าบัญชี) เพื่อไม่ให้แท็บแน่นเกินไป
    isAdmin ? { href: '/admin/menu', label: 'จัดการ', icon: 'grid' } : { href: '/payslips', label: 'สลิป', icon: 'receipt' },
    { href: '/me', label: 'บัญชี', icon: 'user' },
  ];
}

export const ADMIN_LINKS = [
  { href: '/admin', label: 'ภาพรวมวันนี้', desc: 'ใครมา / สาย / กำลังทำงาน', icon: 'house' },
  { href: '/admin/employees', label: 'พนักงาน', desc: 'ข้อมูลและค่าจ้าง', icon: 'users' },
  { href: '/admin/attendance', label: 'บันทึกเวลาเข้า-ออก', desc: 'ตรวจ / แก้ไขเวลา', icon: 'list' },
  { href: '/admin/leave', label: 'วันลา', desc: 'อนุมัติ / ตารางวันลา', icon: 'leave' },
  { href: '/admin/rewards', label: 'รางวัล', desc: 'badge / แลกเงิน', icon: 'reward' },
  { href: '/admin/announcements', label: 'ประกาศ', desc: 'แจ้งข่าวถึงพนักงาน', icon: 'megaphone' },
  { href: '/admin/payroll', label: 'เงินเดือน', desc: 'คำนวณ / อนุมัติ / สลิป', icon: 'wallet' },
  { href: '/admin/stores', label: 'ร้าน / สาขา', desc: 'พิกัดและรัศมี', icon: 'store' },
  { href: '/admin/shifts', label: 'กะ / วันหยุด', desc: 'เวลาทำงาน', icon: 'calendar' },
  { href: '/admin/settings', label: 'ตั้งค่า', desc: 'OT / ประกันสังคม / ภาษี', icon: 'settings' },
] as const;
