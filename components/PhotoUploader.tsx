'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, LoaderCircle, Trash2 } from 'lucide-react';
import { removePhotoAction, uploadPhotoAction } from '@/app/actions/photo';

const SIZE = 400;

/** ครอบรูปเป็นสี่เหลี่ยมจัตุรัสตรงกลาง แล้วย่อเหลือ 400×400 JPEG ก่อนส่ง */
async function squareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.85));
}

export function PhotoUploader({
  employeeId,
  hasPhoto,
  children,
}: {
  employeeId: number;
  hasPhoto: boolean;
  /** รูปปัจจุบัน (Avatar) */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run(fn: (fd: FormData) => Promise<{ ok: boolean; message: string }>, fd: FormData) {
    start(async () => {
      const r = await fn(fd);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg({ ok: false, text: 'กรุณาเลือกไฟล์รูป' });
      return;
    }
    try {
      const blob = await squareJpeg(file);
      const fd = new FormData();
      fd.set('employeeId', String(employeeId));
      fd.set('photo', blob, 'photo.jpg');
      run(uploadPhotoAction, fd);
    } catch {
      setMsg({ ok: false, text: 'เปิดไฟล์รูปนี้ไม่ได้ ลองเลือกรูปอื่น' });
    }
  }

  return (
    <div className="photo-uploader">
      <button type="button" className="photo-target" onClick={() => input.current?.click()} disabled={pending} aria-label="เปลี่ยนรูป">
        {children}
        <span className="photo-badge">{pending ? <LoaderCircle size={16} className="spin" /> : <Camera size={16} />}</span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={onPick} />
      <div className="row" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={pending}>
          <Camera size={16} /> {hasPhoto ? 'เปลี่ยนรูป' : 'เพิ่มรูป'}
        </button>
        {hasPhoto && (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={pending}
            onClick={() => {
              if (!confirm('ลบรูปนี้?')) return;
              const fd = new FormData();
              fd.set('employeeId', String(employeeId));
              run(removePhotoAction, fd);
            }}
          >
            <Trash2 size={16} /> ลบรูป
          </button>
        )}
      </div>
      {msg && <div className={`alert ${msg.ok ? 'alert-ok' : 'alert-err'}`} style={{ justifyContent: 'center' }}>{msg.text}</div>}
    </div>
  );
}
