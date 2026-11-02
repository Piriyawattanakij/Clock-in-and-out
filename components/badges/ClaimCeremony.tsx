'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { claimAchievementAction } from '@/app/actions/rewards';
import { TIER_INFO } from '@/lib/achievement-defs';
import { BadgeArt, type BadgeVisual } from './BadgeArt';
import { BadgeCoin } from './BadgeCoin';
import { ShareBadge } from './ShareBadge';

export interface ClaimItem {
  id: number;
  def: BadgeVisual & { description: string; kanjiMeaning: string };
  amount: number; // สตางค์
  note: string | null;
  awardedAt: string;
  count: number; // ได้ badge นี้มาแล้วกี่ครั้ง (รวมครั้งนี้)
}

/** ระยะเวลาของแต่ละช่วง (มิลลิวินาที) */
const CHARGE_MS = 1400;
const COUNT_START_MS = 2300;
const COUNT_MS = 1300;

const baht = (s: number) => Math.round(s / 100).toLocaleString('th-TH');

/** นับตัวเลขขึ้นจาก 0 */
function CountUp({ to, delay, duration }: { to: number; delay: number; duration: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
      else navigator.vibrate?.(20);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return <>{baht(v)}</>;
}

/**
 * พิธีรับ badge
 * sealed   → badge เงาสีทองลอยอยู่ "แตะเพื่อรับ"
 * charging → สั่นแรงขึ้น วงแสงดูดเข้า แสงรัศมีเร่ง (1.4 วิ)
 * revealed → แสงวาบ + คลื่นกระแทก + ประกายทอง + ซากุระ 2 ระลอก + เหรียญหมุน ~5 รอบ
 *            แล้วข้อความทยอยขึ้น ตัวเลขเงินนับขึ้น ปุ่มขึ้นท้ายสุด
 */
export function ClaimCeremony({ items, employeeName }: { items: ClaimItem[]; employeeName: string }) {
  const router = useRouter();
  const [queue, setQueue] = useState(items);
  const [stage, setStage] = useState<'sealed' | 'charging' | 'revealed'>('sealed');
  const [, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = queue[0];

  const petals = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        // ระลอกแรกพร้อมระเบิด ระลอกสองตามมา แล้วตกต่อเนื่อง
        delay: i < 20 ? Math.random() * 0.8 : 1.2 + Math.random() * 3,
        dur: 4 + Math.random() * 4,
        size: 8 + Math.random() * 12,
        drift: (Math.random() - 0.5) * 200,
        spin: (Math.random() - 0.5) * 900,
        key: `${item?.id}-${i}`,
      })),
    [item?.id],
  );
  const sparks = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ a: (i / 28) * 360 + Math.random() * 8, d: 140 + Math.random() * 160, s: 4 + Math.random() * 6, delay: Math.random() * 0.25 })), [item?.id]);

  useEffect(() => {
    if (!item) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [item]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!item) return null;

  const reveal = () => {
    if (stage !== 'sealed') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    start(() => claimAchievementAction(item.id));
    if (reduce) {
      setStage('revealed');
      return;
    }
    setStage('charging');
    navigator.vibrate?.([15, 80, 15, 60, 15, 40, 15, 30, 15]);
    timer.current = setTimeout(() => {
      setStage('revealed');
      navigator.vibrate?.([60, 40, 160]);
    }, CHARGE_MS);
  };
  const next = () => {
    const rest = queue.slice(1);
    setQueue(rest);
    setStage('sealed');
    if (rest.length === 0) router.refresh();
  };

  const tier = item.def.tier ? TIER_INFO[item.def.tier] : null;
  const awardedText = new Date(item.awardedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={`ceremony ${stage}`} role="dialog" aria-modal="true" aria-label="รับ badge ใหม่">
      <div className="ceremony-rays" />
      <div className="ceremony-rays rays-2" />
      {stage === 'charging' && (
        <div className="charge-rings" aria-hidden>
          <i /><i /><i />
        </div>
      )}
      {stage === 'revealed' && (
        <>
          <div className="ceremony-flash" />
          <div className="shockwave" aria-hidden><i /><i /></div>
          <div className="sparks" aria-hidden>
            {sparks.map((s, i) => (
              <i key={i} style={{ ['--a' as string]: `${s.a}deg`, ['--d' as string]: `${s.d}px`, width: s.s, height: s.s, animationDelay: `${s.delay}s` }} />
            ))}
          </div>
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
        {stage !== 'revealed' ? (
          <button type="button" className="sealed-badge" onClick={reveal} aria-label="แตะเพื่อรับ badge">
            <BadgeArt def={item.def} size={200} idSuffix="-sealed" />
            <span className="sealed-tag">{stage === 'charging' ? 'กำลังเปิด…' : 'แตะเพื่อรับ'}</span>
          </button>
        ) : (
          <BadgeCoin def={item.def} size={220} grand back={{ title: item.def.name, lines: [awardedText] }} />
        )}

        <div className="ceremony-text">
          {stage !== 'revealed' ? (
            <>
              <div className="ceremony-kicker">🎉 ยินดีด้วย!</div>
              <h2>คุณได้รับ badge ใหม่</h2>
            </>
          ) : (
            <>
              <div className="ceremony-kicker step s1">{tier ? `${tier.emoji} ระดับ ${tier.name}` : `${item.def.kanji} · ${item.def.kanjiMeaning}`}</div>
              <h2 className="step s2">{item.def.name}</h2>
              <p className="step s3">{item.note ?? item.def.description}</p>
              {item.amount > 0 && (
                <div className="ceremony-reward step s4">
                  +฿<CountUp to={item.amount} delay={COUNT_START_MS} duration={COUNT_MS} /> เข้ากระปุก KICHI
                </div>
              )}
              <p className="ceremony-hint step s5">ปัดที่เหรียญเพื่อหมุนดู</p>
              <div className="ceremony-actions step s6">
                <ShareBadge
                  def={item.def}
                  className="btn btn-block ceremony-share"
                  info={{
                    badgeName: item.def.name,
                    kanji: item.def.kanji,
                    kanjiMeaning: item.def.kanjiMeaning,
                    tier: item.def.tier,
                    description: item.def.description,
                    employeeName,
                    awardedAt: item.awardedAt,
                    count: item.count,
                    amount: item.amount,
                  }}
                />
                <button type="button" className="btn btn-block ceremony-btn" onClick={next}>
                  {queue.length > 1 ? 'รับ badge ถัดไป →' : 'เก็บเข้าสมุดสะสม'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
