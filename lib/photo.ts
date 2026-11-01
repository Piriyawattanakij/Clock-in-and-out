export const MAX_PHOTO_BYTES = 1_000_000;

/** ตรวจชนิดไฟล์จากเนื้อไฟล์จริง (ไม่เชื่อนามสกุล/ชนิดที่เบราว์เซอร์ส่งมา) */
export function sniffImageType(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (
    b.length >= 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP'
  )
    return 'image/webp';
  return null;
}

export function photoUrl(emp: { id: number; photoUpdatedAt: Date | null }): string | null {
  return emp.photoUpdatedAt ? `/api/photo/${emp.id}?v=${emp.photoUpdatedAt.getTime()}` : null;
}
