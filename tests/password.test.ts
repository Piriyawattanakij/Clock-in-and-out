import { describe, expect, it } from 'vitest';
import { validateNewPassword } from '@/lib/password';

describe('validateNewPassword', () => {
  it('accepts a good password', () => {
    expect(validateNewPassword('kichi2026', 'kichi2026', 'old123')).toBeNull();
  });
  it('rejects short, mismatched, or unchanged passwords', () => {
    expect(validateNewPassword('12345', '12345')).toMatch('อย่างน้อย');
    expect(validateNewPassword('abcdef', 'abcdeg')).toMatch('ไม่ตรงกัน');
    expect(validateNewPassword('same123', 'same123', 'same123')).toMatch('ไม่ซ้ำ');
    expect(validateNewPassword('ก'.repeat(30), 'ก'.repeat(30))).toMatch('ยาวเกินไป');
  });
});
