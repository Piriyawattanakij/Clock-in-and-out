/** โลโก้ร้าน — สลับเป็นเวอร์ชันตัวอักษรสีครีมอัตโนมัติในโหมดมืด */
export function BrandLogo({ height = 40, className, style }: { height?: number; className?: string; style?: React.CSSProperties }) {
  const width = Math.round((height * 900) / 454);
  return (
    <picture className={className} style={{ display: 'inline-block', lineHeight: 0, ...style }}>
      <source srcSet="/brand/kichi-logo-dark.png" media="(prefers-color-scheme: dark)" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/kichi-logo.png" alt="KICHI — Sushi · Salmon · Salad" width={width} height={height} style={{ height, width: 'auto' }} />
    </picture>
  );
}
