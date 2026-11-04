'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, LoaderCircle, Share2, X } from 'lucide-react';
import { BadgeArt, type BadgeVisual } from './BadgeArt';
import { renderShareImage, type ShareInfo } from './shareImage';

/**
 * ปุ่มแชร์ badge เป็นรูปภาพ
 * กดแล้วสร้างรูป → แสดงตัวอย่าง → แชร์ (มือถือ: เปิดเมนูแชร์ของเครื่อง) หรือบันทึกรูป
 * แยกเป็น 2 ขั้น เพราะเบราว์เซอร์บนมือถือให้เรียกเมนูแชร์ได้เฉพาะตอนผู้ใช้กดปุ่มเท่านั้น
 */
export function ShareBadge({
  def,
  info,
  className = 'btn btn-block',
  label = 'แชร์เป็นรูปภาพ',
}: {
  def: BadgeVisual;
  info: Omit<ShareInfo, 'amount'> & { amount?: number | null };
  className?: string;
  label?: string;
}) {
  const art = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);
  const [withAmount, setWithAmount] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function build(showAmount: boolean) {
    const svg = art.current?.querySelector('svg');
    if (!svg) return;
    setBusy(true);
    setError('');
    try {
      const blob = await renderShareImage(svg, { ...info, amount: showAmount ? info.amount : null });
      const file = new File([blob], `kichi-badge-${def.key}.png`, { type: 'image/png' });
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { url: URL.createObjectURL(blob), file };
      });
    } catch {
      setError('สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  const canShare = !!preview && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [preview.file] });

  async function share() {
    if (!preview) return;
    try {
      await navigator.share({ files: [preview.file], title: `ได้รับ badge “${info.badgeName}”`, text: `ได้รับ badge “${info.badgeName}” จาก KICHI 🎉` });
    } catch {
      /* ผู้ใช้ปิดเมนูแชร์ */
    }
  }

  function download() {
    if (!preview) return;
    const a = document.createElement('a');
    a.href = preview.url;
    a.download = preview.file.name;
    a.click();
  }

  return (
    <>
      <div ref={art} className="share-art-src" aria-hidden>
        <BadgeArt def={def} size={600} idSuffix="-share" />
      </div>
      <button type="button" className={className} onClick={() => build(withAmount)} disabled={busy}>
        {busy ? <LoaderCircle size={18} className="spin" /> : <Share2 size={18} />} {label}
      </button>
      {error && <div className="alert alert-err">{error}</div>}
      {preview && mounted &&
        createPortal(
          <div className="share-sheet" role="dialog" aria-modal="true" aria-label="แชร์ badge" onClick={(e) => e.target === e.currentTarget && close()}>
            <button type="button" className="viewer-close" onClick={close} aria-label="ปิด"><X size={22} /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt={`รูป badge ${info.badgeName}`} className="share-preview" />
            <div className="share-actions">
              {info.amount ? (
                <label className="check share-toggle">
                  <input
                    type="checkbox"
                    checked={withAmount}
                    onChange={(e) => {
                      setWithAmount(e.target.checked);
                      build(e.target.checked);
                    }}
                  />
                  แสดงจำนวนเงินรางวัลในรูป
                </label>
              ) : null}
              {canShare && (
                <button type="button" className="btn btn-block share-primary" onClick={share} disabled={busy}>
                  <Share2 size={18} /> แชร์ไปที่…
                </button>
              )}
              <button type="button" className={`btn btn-block ${canShare ? 'share-secondary' : 'share-primary'}`} onClick={download} disabled={busy}>
                <Download size={18} /> บันทึกรูป
              </button>
              <p className="ceremony-hint" style={{ textAlign: 'center', margin: 0 }}>
                {canShare ? 'เลือก Facebook / Instagram / LINE จากเมนูแชร์ของเครื่องได้เลย' : 'บนมือถือ ถ้ารูปเปิดขึ้นมา ให้กดค้างที่รูปเพื่อบันทึก'}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
