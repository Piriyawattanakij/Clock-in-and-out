'use client';

import { useEffect, useRef } from 'react';
import { BadgeArt, ringColors, type BadgeVisual } from './BadgeArt';

const EDGE_LAYERS = 14;
const EDGE_GAP = 0.9; // px ต่อชั้น → ความหนาเหรียญ ~12px

/**
 * เหรียญ badge 3 มิติแบบ Apple Watch
 * - ปัดซ้าย/ขวาเพื่อหมุน (มีแรงเฉื่อย) แล้วจะค่อย ๆ กลับมาหันหน้า
 * - เปิดขึ้นมาจะหมุนเข้ามาเอง (spinIn)
 */
export function BadgeCoin({
  def,
  size = 240,
  spinIn = true,
  back,
}: {
  def: BadgeVisual;
  size?: number;
  spinIn?: boolean;
  /** ข้อความด้านหลังเหรียญ */
  back?: { title: string; lines: string[] };
}) {
  const coin = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLDivElement>(null);
  const [r1, r2] = ringColors(def);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let angle = spinIn && !reduce ? -720 : 0;
    let vel = spinIn && !reduce ? 26 : 0;
    let tilt = 0;
    let tiltVel = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let raf = 0;
    const start = performance.now();

    const el = coin.current!;
    const stage = el.parentElement!;

    const frame = (now: number) => {
      if (!dragging) {
        // แรงเฉื่อย แล้วสปริงกลับมาหันหน้า (มุมที่เป็นทวีคูณของ 360)
        const target = Math.round(angle / 360) * 360;
        if (Math.abs(vel) > 2.5) vel *= 0.965;
        else vel += (target - angle) * 0.035;
        vel *= 0.9;
        angle += vel;
        tiltVel += (-tilt) * 0.06;
        tiltVel *= 0.85;
        tilt += tiltVel;
      }
      // ขยับเบา ๆ ตอนอยู่นิ่ง ให้ดูมีชีวิต
      const idle = reduce ? 0 : Math.sin((now - start) / 900) * 4;
      el.style.transform = `rotateX(${tilt + idle * 0.5}deg) rotateY(${angle + idle}deg)`;
      const a = (((angle % 360) + 360) % 360) / 360;
      if (shine.current) shine.current.style.backgroundPosition = `${(1 - a) * 200 - 50}% ${50 + tilt}%`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      vel = 0;
      stage.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dt = Math.max(1, now - lastT);
      angle += dx * 0.9;
      tilt = Math.max(-25, Math.min(25, tilt - dy * 0.3));
      vel = ((dx * 0.9) / dt) * 16; // องศาต่อเฟรม
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
    };
    const up = () => {
      dragging = false;
      vel = Math.max(-45, Math.min(45, vel));
    };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
    };
  }, [spinIn]);

  const half = (EDGE_LAYERS * EDGE_GAP) / 2;
  return (
    <div className="coin-stage" style={{ width: size, height: size }} aria-label={`${def.name} — ปัดเพื่อหมุน`}>
      <div ref={coin} className="coin" style={{ width: size, height: size }}>
        {Array.from({ length: EDGE_LAYERS }, (_, i) => (
          <div
            key={i}
            className="coin-edge"
            style={{ transform: `translateZ(${i * EDGE_GAP - half}px)`, background: `linear-gradient(90deg, ${r2}, ${r1} 50%, ${r2})` }}
          />
        ))}
        <div className="coin-face" style={{ transform: `translateZ(${half + 0.5}px)` }}>
          <BadgeArt def={def} size={size} idSuffix="-coin" />
          <div ref={shine} className="coin-shine" />
        </div>
        <div className="coin-face coin-back" style={{ transform: `rotateY(180deg) translateZ(${half + 0.5}px)`, ['--r1' as string]: r1, ['--r2' as string]: r2 }}>
          <div className="coin-back-inner">
            <span className="coin-back-kanji">{def.kanji}</span>
            <b>{back?.title ?? def.name}</b>
            {back?.lines.map((l, i) => <span key={i}>{l}</span>)}
            <small>KICHI</small>
          </div>
        </div>
      </div>
    </div>
  );
}
