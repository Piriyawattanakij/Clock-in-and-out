// จำนวนเงินทั้งหมดในระบบเก็บเป็น "สตางค์" (จำนวนเต็ม)
export function fmtBaht(satang: number): string {
  return (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseBaht(v: FormDataEntryValue | null | undefined): number {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** ค่าสำหรับใส่ใน input (บาท) */
export function toBahtInput(satang: number): string {
  return (satang / 100).toFixed(2);
}
