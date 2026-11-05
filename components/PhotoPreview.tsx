'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X } from 'lucide-react';
import { photoUrl } from '@/lib/photo';
import { Avatar } from './Avatar';

/**
 * รูปโปรไฟล์ที่กดดูภาพใหญ่ได้ (ถ้ายังไม่มีรูป แสดงตัวอักษรแรกเหมือนเดิม และกดไม่ได้)
 */
export function PhotoPreview({
  emp,
  size = 44,
  className = '',
  caption,
  action,
}: {
  emp: { id: number; name: string; photoUpdatedAt: Date | string | null };
  size?: number;
  className?: string;
  /** ข้อความใต้ชื่อในหน้าต่างภาพใหญ่ */
  caption?: string;
  /** ลิงก์เพิ่มเติมในหน้าต่าง เช่น "เปลี่ยนรูป" */
  action?: { href: string; label: string };
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const e = { ...emp, photoUpdatedAt: emp.photoUpdatedAt ? new Date(emp.photoUpdatedAt) : null };
  const url = photoUrl(e);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!url) return <Avatar emp={e} size={size} className={className} />;
  return (
    <>
      <button
        type="button"
        className="photo-preview-btn"
        onClick={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setOpen(true);
        }}
        aria-label={`ดูรูปของ ${emp.name}`}
      >
        <Avatar emp={e} size={size} className={className} />
      </button>
      {open && mounted &&
        createPortal(
          <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`รูปของ ${emp.name}`} onClick={(ev) => ev.target === ev.currentTarget && setOpen(false)}>
            <button type="button" className="viewer-close" onClick={() => setOpen(false)} aria-label="ปิด"><X size={22} /></button>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={emp.name} />
              <figcaption>
                <b>{emp.name}</b>
                {caption && <span>{caption}</span>}
                {action && <Link href={action.href} className="btn btn-sm" onClick={() => setOpen(false)}>{action.label}</Link>}
              </figcaption>
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
