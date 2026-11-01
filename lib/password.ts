export const MIN_PASSWORD = 6;
export const MAX_PASSWORD = 72; // bcrypt ใช้ได้สูงสุด 72 ไบต์

/** ตรวจรหัสผ่านใหม่ — คืนข้อความผิดพลาด หรือ null ถ้าใช้ได้ */
export function validateNewPassword(next: string, confirm: string, current?: string): string | null {
  if (next.length < MIN_PASSWORD) return `รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`;
  if (new TextEncoder().encode(next).length > MAX_PASSWORD) return 'รหัสผ่านยาวเกินไป';
  if (next !== confirm) return 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน';
  if (current !== undefined && next === current) return 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม';
  return null;
}
