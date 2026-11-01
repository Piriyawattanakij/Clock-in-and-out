'use client';

import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { GROUP_LABEL, TIER_INFO, type AchievementGroup } from '@/lib/achievement-defs';
import { BadgeArt, type BadgeVisual } from './BadgeArt';
import { BadgeCoin } from './BadgeCoin';

export interface CollectionItem {
  def: BadgeVisual & { description: string; kanjiMeaning: string; repeatable: boolean };
  /** จำนวนครั้งที่ได้ */
  count: number;
  firstAt: string | null;
  lastAt: string | null;
  totalAmount: number; // สตางค์ที่ได้จาก badge นี้
  amount: number; // รางวัลปัจจุบันต่อครั้ง
  progress?: { current: number; target: number } | null;
}

const baht = (s: number) => (s / 100).toLocaleString('th-TH');
const date = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

export function BadgeCollection({ items }: { items: CollectionItem[] }) {
  const [open, setOpen] = useState<CollectionItem | null>(null);
  const groups = (Object.keys(GROUP_LABEL) as AchievementGroup[]).filter((g) => items.some((i) => i.def.group === g));

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {groups.map((g) => (
        <section key={g}>
          <div className="section-title"><h2>{GROUP_LABEL[g]}</h2></div>
          <div className="badge-grid">
            {items
              .filter((i) => i.def.group === g)
              .map((i) => {
                const locked = i.count === 0;
                return (
                  <button key={i.def.key} type="button" className={`badge-tile ${locked ? 'locked' : ''}`} onClick={() => setOpen(i)}>
                    <span className="badge-tile-art">
                      <BadgeArt def={i.def} size={84} idSuffix="-tile" />
                      {locked && <span className="lock"><Lock size={14} /></span>}
                      {i.count > 1 && <span className="badge-count">×{i.count}</span>}
                    </span>
                    <b>{i.def.name}</b>
                    {locked && i.progress ? (
                      <span className="mini-bar" aria-label={`${i.progress.current}/${i.progress.target}`}>
                        <span style={{ width: `${Math.min(100, (i.progress.current / i.progress.target) * 100)}%` }} />
                      </span>
                    ) : (
                      <small>{locked ? (i.amount > 0 ? `฿${baht(i.amount)}` : 'badge') : i.lastAt ? date(i.lastAt) : ''}</small>
                    )}
                  </button>
                );
              })}
          </div>
        </section>
      ))}

      {open && (
        <div className="badge-viewer" role="dialog" aria-modal="true" aria-label={open.def.name} onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <button type="button" className="viewer-close" onClick={() => setOpen(null)} aria-label="ปิด"><X size={22} /></button>
          <div className={open.count === 0 ? 'coin-locked' : ''}>
            <BadgeCoin
              key={open.def.key}
              def={open.def}
              size={Math.min(260, typeof window !== 'undefined' ? window.innerWidth - 100 : 260)}
              back={{
                title: open.def.name,
                lines: open.count ? [`ได้รับ ${open.count} ครั้ง`, open.firstAt ? `ครั้งแรก ${date(open.firstAt)}` : ''] : ['ยังไม่ได้รับ'],
              }}
            />
          </div>
          <div className="viewer-info">
            <div className="ceremony-kicker">
              {open.def.tier ? `${TIER_INFO[open.def.tier].emoji} ระดับ ${TIER_INFO[open.def.tier].name}` : `${open.def.kanji} · ${open.def.kanjiMeaning}`}
            </div>
            <h2>{open.def.name}</h2>
            <p>{open.def.description}</p>
            <div className="viewer-stats">
              <div><span>รางวัล</span><b>{open.amount > 0 ? `฿${baht(open.amount)}` : '—'}</b></div>
              <div><span>ได้รับแล้ว</span><b>{open.count} ครั้ง</b></div>
              <div><span>รวมเป็นเงิน</span><b>{open.totalAmount > 0 ? `฿${baht(open.totalAmount)}` : '—'}</b></div>
            </div>
            {open.progress && open.count === 0 && (
              <div className="viewer-progress">
                <span>ความคืบหน้า {open.progress.current}/{open.progress.target}</span>
                <span className="mini-bar"><span style={{ width: `${Math.min(100, (open.progress.current / open.progress.target) * 100)}%` }} /></span>
              </div>
            )}
            <p className="ceremony-hint">ปัดที่เหรียญเพื่อหมุนดู{open.def.repeatable ? ' · ได้ซ้ำทุกเดือน' : ''}</p>
          </div>
        </div>
      )}
    </>
  );
}
