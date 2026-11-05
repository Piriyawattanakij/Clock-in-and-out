/**
 * ฉากวันหยุด: ฟ้ายามเช้า พระอาทิตย์ลอย เมฆเคลื่อน ภูเขาฟูจิ ถ้วยชาเขียวมีไอร้อน และกลีบซากุระ
 * (CSS ล้วน ไม่มี JavaScript — เคารพ prefers-reduced-motion)
 */
export function RestDay({ title, subtitle, note }: { title: string; subtitle: string; note?: string | null }) {
  return (
    <section className="rest-scene" aria-label={title}>
      <div className="rest-sky" aria-hidden>
        <span className="rest-sun" />
        <span className="rest-cloud c1" />
        <span className="rest-cloud c2" />
        <span className="rest-kanji">休</span>
        <svg className="rest-fuji" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path d="M0 120 L140 38 Q200 4 260 38 L400 120 Z" className="mt" />
          <path d="M140 38 Q200 4 260 38 L240 50 L222 40 L204 52 L186 41 L168 51 Z" className="snow" />
        </svg>
        <svg className="rest-cup" viewBox="0 0 120 120">
          <path className="steam s1" d="M44 46 C36 34 52 26 44 12" />
          <path className="steam s2" d="M60 44 C52 30 68 22 60 6" />
          <path className="steam s3" d="M76 46 C68 34 84 26 76 12" />
          <path className="cup" d="M22 58 H98 C98 86 82 104 60 104 C38 104 22 86 22 58 Z" />
          <ellipse className="tea" cx="60" cy="58" rx="38" ry="7" />
          <path className="band" d="M26 72 H94" />
        </svg>
        <span className="rest-petal p1" />
        <span className="rest-petal p2" />
        <span className="rest-petal p3" />
        <span className="rest-petal p4" />
        <span className="rest-petal p5" />
      </div>
      <div className="rest-text">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {note && <span className="chip rest-chip">{note}</span>}
      </div>
    </section>
  );
}
