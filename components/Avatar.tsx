import { photoUrl } from '@/lib/photo';

/** รูปพนักงาน หรือตัวอักษรแรกของชื่อถ้ายังไม่มีรูป */
export function Avatar({
  emp,
  size = 44,
  className = '',
}: {
  emp: { id: number; name: string; photoUpdatedAt: Date | null };
  size?: number;
  className?: string;
}) {
  const url = photoUrl(emp);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={emp.name} className={`avatar-img ${className}`} style={style} />
  ) : (
    <span className={`avatar-initial ${className}`} style={style} aria-label={emp.name}>
      {emp.name.trim().charAt(0)}
    </span>
  );
}
