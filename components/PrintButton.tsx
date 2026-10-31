'use client';

export function PrintButton({ label = 'พิมพ์ / บันทึก PDF' }: { label?: string }) {
  return (
    <button className="btn no-print" onClick={() => window.print()}>
      🖨 {label}
    </button>
  );
}
