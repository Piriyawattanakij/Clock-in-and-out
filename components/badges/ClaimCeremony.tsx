'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimAchievementAction } from '@/app/actions/rewards';
import { TIER_INFO } from '@/lib/achievement-defs';
import { BadgeArt, type BadgeVisual } from './BadgeArt';
import { BadgeCoin } from './BadgeCoin';

export interface ClaimItem {
  id: number;
  def: BadgeVisual & { description: string; kanjiMeaning: string };
  amount: number; // สตางค์
  note: string | null;
  awardedAt: string;
}

const baht = (s: number) => (s / 100).toLocaleString('th-TH');

/** พิธีรับ badge: แตะซองเพื่อเปิด → แสง + กลีบซากุระ + เหรียญหมุนเข้ามา */
export function ClaimCeremony({ items }: { items: ClaimItem[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState(items);
  const [stage, setStage] = useState<'sealed' | 'revealed'>('sealed');
  const [, start] = useTransition();
  const item = queue[0];

  // กลีบซากุระแบบสุ่มครั้งเดียวต่อ badge
  const petals = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        dur: 3 + Math.random() * 3,
        size: 8 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() - 0.5) * 720,
        key: `${item?.id}-${i}`,
      })),
    [item?.id],
  );

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [item]);

  if (!item) return null;

  const reveal = () => {
    if (stage !== 'sealed') return;
    setStage('revealed');
    navigator.vibrate?.([30, 60, 120]);
    start(() => claimAchievementAction(item.id));
  };
  const next = () => {
    const rest = queue.slice(1);
    setQueue(rest);
    setStage('sealed');
    if (rest.length === 0) router.refresh();
  };

  return (
    <div className={`ceremony ${stage}`} role="dialog" aria-modal="true" aria-label="รับ badge ใหม่">
      <div className="ceremony-rays" />
      {stage === 'revealed' && (
        <>
          <div className="ceremony-flash" />
          <div className="petals" aria-hidden>
            {petals.map((p) => (
              <i
                key={p.key}
                style={{
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size * 0.8,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.dur}s`,
                  ['--drift' as string]: `${p.drift}px`,
                  ['--spin' as string]: `${p.spin}deg`,
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="ceremony-body">
        {queue.length > 1 && <div className="ceremony-count">{queue.length} badge ใหม่</div>}
        {stage === 'sealed' ? (
          <button type="button" className="sealed-badge" onClick={reveal} aria-label="แตะเพื่อรับ badge">
            <BadgeArt def={item.def} size={200} idSuffix="-sealed" />
            <span className="sealed-tag">แตะเพื่อรับ</span>
          </button>
        ) : (
          <BadgeCoin
            def={item.def}
            size={220}
            back={{ title: item.def.name, lines: [new Date(item.awardedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })] }}
          />
        )}

        <div className="ceremony-text">
          {stage === 'sealed' ? (
            <>
              <div className="ceremony-kicker">🎉 ยินดีด้วย!</div>
              <h2>คุณได้รับ badge ใหม่</h2>
            </>
          ) : (
            <>
              <div className="ceremony-kicker">
                {item.def.tier ? `${TIER_INFO[item.def.tier].emoji} ระดับ ${TIER_INFO[item.def.tier].name}` : `${item.def.kanji} · ${item.def.kanjiMeaning}`}
              </div>
              <h2>{item.def.name}</h2>
              <p>{item.note ?? item.def.description}</p>
              {item.amount > 0 && <div className="ceremony-reward">+฿{baht(item.amount)} เข้ากระปุก KICHI</div>}
              <p className="ceremony-hint">ปัดที่เหรียญเพื่อหมุนดู</p>
              <button type="button" className="btn btn-block ceremony-btn" onClick={next}>
                {queue.length > 1 ? 'รับ badge ถัดไป →' : 'เก็บเข้าสมุดสะสม'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
