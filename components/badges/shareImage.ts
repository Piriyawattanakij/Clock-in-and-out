'use client';

import { TIER_INFO, type Tier } from '@/lib/achievement-defs';

export const SHARE_W = 1080;
export const SHARE_H = 1350; // 4:5 — เหมาะกับ IG / Facebook feed

export interface ShareInfo {
  badgeName: string;
  kanji: string;
  kanjiMeaning: string;
  tier: Tier;
  description: string;
  employeeName: string;
  awardedAt: string | null; // ISO
  count: number;
  /** แสดงเงินรางวัลในรูป (ค่าเริ่มต้น: ไม่แสดง) */
  amount?: number | null; // สตางค์
}

let fontDataUrl: Promise<string> | null = null;
/** ฟอนต์คันจิต้องฝังลงใน SVG เพราะ SVG ที่แปลงเป็นรูปจะใช้ฟอนต์ของหน้าเว็บไม่ได้ */
function kanjiFont(): Promise<string> {
  fontDataUrl ??= fetch('/fonts/badge-kanji.woff2')
    .then((r) => r.blob())
    .then(
      (b) =>
        new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.onerror = rej;
          fr.readAsDataURL(b);
        }),
    );
  return fontDataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

async function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1000');
  clone.setAttribute('height', '1000');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `@font-face{font-family:'BadgeKanji';src:url(${await kanjiFont()}) format('woff2');font-weight:800;}`;
  clone.insertBefore(style, clone.firstChild);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** ฟอนต์ภาษาไทยของแอพ (next/font ตั้งชื่อให้เอง จึงอ่านจาก CSS variable) */
function thaiFont() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-thai').trim();
  return v || 'sans-serif';
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, maxW: number) {
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > maxW && s > 20) {
    s -= 2;
    ctx.font = font(s);
  }
  return s;
}

/** วาดรูปการ์ด badge สำหรับแชร์ แล้วคืนเป็นไฟล์ PNG */
export async function renderShareImage(svg: SVGSVGElement, info: ShareInfo): Promise<Blob> {
  const family = thaiFont();
  await Promise.all([
    document.fonts.load(`700 72px ${family}`, 'ขยันเต็มเดือน'),
    document.fonts.load(`400 36px ${family}`, 'ได้รับเมื่อ'),
  ]).catch(() => undefined);
  const [badge, logo] = await Promise.all([svgToImage(svg), loadImage('/brand/kichi-logo-dark.png')]);

  const c = document.createElement('canvas');
  c.width = SHARE_W;
  c.height = SHARE_H;
  const ctx = c.getContext('2d')!;
  const cx = SHARE_W / 2;
  const badgeY = 640;

  // พื้นหลัง
  const bg = ctx.createLinearGradient(0, 0, 0, SHARE_H);
  bg.addColorStop(0, '#2a2117');
  bg.addColorStop(1, '#0f0b07');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  // รัศมีอาทิตย์ (旭日)
  ctx.save();
  ctx.translate(cx, badgeY);
  const rays = 24;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 1100, a, a + Math.PI / rays);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 210, 120, 0.06)';
    ctx.fill();
  }
  ctx.restore();
  const glow = ctx.createRadialGradient(cx, badgeY, 40, cx, badgeY, 520);
  glow.addColorStop(0, 'rgba(255, 214, 130, 0.55)');
  glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  // กลีบซากุระ (ตำแหน่งคงที่ ให้รูปออกมาเหมือนเดิมทุกครั้ง)
  const petals: [number, number, number, number][] = [
    [120, 260, 26, 0.4], [960, 210, 22, 1.2], [150, 960, 30, 2.1], [930, 900, 24, 0.8], [80, 620, 18, 2.6],
    [1010, 560, 20, 1.7], [300, 120, 16, 0.2], [1000, 1080, 18, 2.9], [70, 1160, 22, 1.1], [990, 1250, 16, 0.6],
  ];
  for (const [x, y, s, r] of petals) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(r);
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#ffd1dc');
    g.addColorStop(1, '#f28cab');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // โลโก้ร้าน
  const lw = 300;
  ctx.drawImage(logo, cx - lw / 2, 64, lw, (lw * logo.height) / logo.width);

  // badge
  const bs = 560;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.drawImage(badge, cx - bs / 2, badgeY - bs / 2, bs, bs);
  ctx.restore();

  // ข้อความ
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const kicker = info.tier ? `${info.kanji} · ระดับ ${TIER_INFO[info.tier].name.toUpperCase()}` : `${info.kanji} · ${info.kanjiMeaning}`;
  ctx.fillStyle = '#f3d48a';
  ctx.font = `600 34px ${family}`;
  ctx.fillText(kicker, cx, 1005);

  ctx.fillStyle = '#ffffff';
  const nameSize = fitText(ctx, info.badgeName, (s) => `700 ${s}px ${family}`, 84, SHARE_W - 120);
  ctx.font = `700 ${nameSize}px ${family}`;
  ctx.fillText(info.badgeName, cx, 1100);

  const when = info.awardedAt ? new Date(info.awardedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `500 38px ${family}`;
  ctx.fillText(info.employeeName, cx, 1170);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `400 30px ${family}`;
  const sub = [when && `ได้รับเมื่อ ${when}`, info.count > 1 ? `ครั้งที่ ${info.count}` : ''].filter(Boolean).join(' · ');
  ctx.fillText(sub, cx, 1218);

  if (info.amount) {
    const label = `+฿${(info.amount / 100).toLocaleString('th-TH')}`;
    ctx.font = `700 34px ${family}`;
    const w = ctx.measureText(label).width + 56;
    const pill = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    pill.addColorStop(0, '#ffe7a3');
    pill.addColorStop(1, '#c9962f');
    ctx.fillStyle = pill;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, 860 + 0, w, 58, 29);
    ctx.fill();
    ctx.fillStyle = '#1c1408';
    ctx.fillText(label, cx, 900);
  }

  ctx.fillStyle = 'rgba(243, 212, 138, 0.55)';
  ctx.font = `500 26px ${family}`;
  ctx.fillText('KICHI · Sushi · Salmon · Salad', cx, SHARE_H - 48);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}
