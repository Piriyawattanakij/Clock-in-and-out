import { describe, expect, it } from 'vitest';
import { afterFailure, CODE_RULE, lockRemaining, type ThrottleState } from '@/lib/throttle';

const t = (min: number) => new Date(Date.UTC(2026, 10, 4, 10, min));

describe('login throttle', () => {
  it('locks after 5 failures within 15 minutes', () => {
    let s: ThrottleState | null = null;
    for (let i = 0; i < 4; i++) s = afterFailure(s, t(i), CODE_RULE);
    expect(lockRemaining(s, t(4))).toBe(0);
    s = afterFailure(s, t(4), CODE_RULE);
    expect(lockRemaining(s, t(5))).toBe(14 * 60_000);
    expect(lockRemaining(s, t(20))).toBe(0);
  });
  it('starts a new window after it expires or after a lock ends', () => {
    let s: ThrottleState | null = null;
    for (let i = 0; i < 4; i++) s = afterFailure(s, t(i), CODE_RULE);
    s = afterFailure(s, t(30), CODE_RULE);
    expect(s.failures).toBe(1);
    expect(s.lockedUntil).toBeNull();
  });
});
