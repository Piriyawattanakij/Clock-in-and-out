import { TIER_INFO, type AchievementDef, type Motif } from '@/lib/achievement-defs';

const GOLD: [string, string] = ['#fff0b8', '#b8862b'];
const SILVER: [string, string] = ['#ffffff', '#8f99a6'];

export type BadgeVisual = Pick<AchievementDef, 'key' | 'kanji' | 'motif' | 'colors' | 'tier' | 'group' | 'name'>;

export function ringColors(def: Pick<AchievementDef, 'tier' | 'group'>): [string, string] {
  if (def.tier) return TIER_INFO[def.tier].ring;
  return def.group === 'fun' || def.group === 'milestone' ? SILVER : GOLD;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** ลายพื้นแบบญี่ปุ่น (วาดภายในวงกลม r=70 รอบจุด 100,100) */
function MotifLayer({ motif, id }: { motif: Motif; id: string }) {
  switch (motif) {
    case 'wave': // 青海波 seigaiha
      return (
        <>
          <defs>
            <pattern id={`${id}-p`} width="28" height="14" patternUnits="userSpaceOnUse">
              {[
                [0, 14],
                [28, 14],
                [14, 7],
              ].map(([cx, cy]) =>
                [13, 9, 5].map((r) => <circle key={`${cx}-${cy}-${r}`} cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeWidth="1.4" />),
              )}
            </pattern>
          </defs>
          <rect x="30" y="30" width="140" height="140" fill={`url(#${id}-p)`} opacity="0.22" />
        </>
      );
    case 'rays': // 旭日 sunburst
      return (
        <g opacity="0.2">
          {Array.from({ length: 16 }, (_, i) => {
            const a1 = (i * 2 * Math.PI) / 16;
            const a2 = a1 + Math.PI / 16;
            return (
              <path
                key={i}
                d={`M100 100 L${round(100 + 80 * Math.cos(a1))} ${round(100 + 80 * Math.sin(a1))} L${round(100 + 80 * Math.cos(a2))} ${round(100 + 80 * Math.sin(a2))} Z`}
                fill="#fff"
              />
            );
          })}
        </g>
      );
    case 'asanoha': // 麻の葉 hemp leaf
      return (
        <>
          <defs>
            <pattern id={`${id}-p`} width="24" height="41.57" patternUnits="userSpaceOnUse">
              <path
                d="M12 0 L12 41.57 M0 6.93 L24 34.64 M24 6.93 L0 34.64 M0 6.93 L12 13.86 L24 6.93 M0 34.64 L12 27.71 L24 34.64 M0 20.78 L24 20.78"
                stroke="#fff"
                strokeWidth="1"
                fill="none"
              />
            </pattern>
          </defs>
          <rect x="30" y="30" width="140" height="140" fill={`url(#${id}-p)`} opacity="0.2" />
        </>
      );
    case 'sakura': {
      // 桜
      const petal = 'M0 -9 C4 -9 5 -4 2.4 -1.2 L0 0 L-2.4 -1.2 C-5 -4 -4 -9 0 -9 Z';
      const spots: [number, number, number, number][] = [
        [58, 62, 1.2, 10],
        [140, 58, 0.9, 40],
        [150, 128, 1.1, 70],
        [52, 136, 0.8, 20],
        [100, 44, 0.7, 55],
        [78, 158, 0.75, 5],
        [128, 160, 0.7, 30],
      ];
      return (
        <g opacity="0.28">
          {spots.map(([x, y, s, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s * 1.3})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <path key={a} d={petal} transform={`rotate(${a})`} fill="#fff" />
              ))}
              <circle r="1.6" fill="#ffd1dc" />
            </g>
          ))}
        </g>
      );
    }
    case 'fuji': // 富士山
      return (
        <g>
          <circle cx="128" cy="70" r="14" fill="#fff" opacity="0.25" />
          <path d="M28 150 L82 92 Q100 76 118 92 L172 150 Z" fill="#000" opacity="0.18" />
          <path d="M82 92 Q100 76 118 92 L110 98 L104 93 L98 99 L92 94 L88 98 Z" fill="#fff" opacity="0.5" />
          <path d="M40 154 Q70 146 100 154 T160 154" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.25" />
        </g>
      );
    case 'dots': // 鹿の子 kanoko
      return (
        <g opacity="0.22">
          {Array.from({ length: 11 }, (_, r) =>
            Array.from({ length: 11 }, (_, c) => {
              const x = 36 + c * 13 + (r % 2) * 6.5;
              const y = 36 + r * 13;
              return <rect key={`${r}-${c}`} x={x} y={y} width="5" height="5" rx="1.5" fill="#fff" transform={`rotate(45 ${x + 2.5} ${y + 2.5})`} />;
            }),
          )}
        </g>
      );
  }
}

/** ภาพ badge สไตล์ตราญี่ปุ่น (SVG) — ใช้ได้ทั้ง server และ client */
export function BadgeArt({ def, size = 96, className = '', idSuffix = '' }: { def: BadgeVisual; size?: number; className?: string; idSuffix?: string }) {
  const id = `bd-${def.key}${idSuffix}`;
  const [r1, r2] = ringColors(def);
  const [c1, c2] = def.colors;
  const scallops = 20;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`badge-art ${className}`} role="img" aria-label={def.name}>
      <defs>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={r1} />
          <stop offset="0.45" stopColor={r2} />
          <stop offset="0.6" stopColor={r1} />
          <stop offset="1" stopColor={r2} />
        </linearGradient>
        <radialGradient id={`${id}-disc`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </radialGradient>
        <radialGradient id={`${id}-gloss`} cx="0.3" cy="0.2" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="100" cy="100" r="70" />
        </clipPath>
      </defs>
      {/* ขอบหยักแบบดอกเบญจมาศ (菊) */}
      <g fill={`url(#${id}-ring)`}>
        {Array.from({ length: scallops }, (_, i) => {
          const a = (i * 2 * Math.PI) / scallops;
          return <circle key={i} cx={round(100 + 86 * Math.cos(a))} cy={round(100 + 86 * Math.sin(a))} r="11" />;
        })}
        <circle cx="100" cy="100" r="88" />
      </g>
      <circle cx="100" cy="100" r="80" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="74" fill="#000" fillOpacity="0.25" />
      <circle cx="100" cy="100" r="71" fill={`url(#${id}-disc)`} stroke={r1} strokeWidth="2" />
      <g clipPath={`url(#${id}-clip)`}>
        <MotifLayer motif={def.motif} id={id} />
      </g>
      {/* ดาวบอกระดับ Tamago / Salmon / Otoro */}
      {def.tier > 0 && (
        <g fill="#fff" stroke={r2} strokeWidth="1">
          {Array.from({ length: def.tier }, (_, i) => {
            const x = 100 + (i - (def.tier - 1) / 2) * 16;
            return (
              <path key={i} transform={`translate(${x} 47) scale(0.55)`} d="M0 -10 L2.9 -3.1 L10 -3.1 L4.3 1.4 L6.5 8.5 L0 4.2 L-6.5 8.5 L-4.3 1.4 L-10 -3.1 L-2.9 -3.1 Z" />
            );
          })}
        </g>
      )}
      <text
        x="100"
        y="124"
        textAnchor="middle"
        fontSize="66"
        fontFamily="'BadgeKanji', 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif CJK JP', serif"
        fontWeight="800"
        fill="#fff"
        stroke="#000"
        strokeOpacity="0.35"
        strokeWidth="3"
        paintOrder="stroke"
      >
        {def.kanji}
      </text>
      <ellipse cx="80" cy="66" rx="52" ry="34" fill={`url(#${id}-gloss)`} />
    </svg>
  );
}
