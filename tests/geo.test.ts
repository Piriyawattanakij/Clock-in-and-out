import { describe, expect, it } from 'vitest';
import { distanceMeters, isValidCoord } from '@/lib/geo';

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(13.7456, 100.5347, 13.7456, 100.5347)).toBe(0);
  });
  it('is ~111 m for 0.001° of latitude', () => {
    expect(distanceMeters(13.7456, 100.5347, 13.7466, 100.5347)).toBeCloseTo(111.2, 0);
  });
  it('validates coordinates', () => {
    expect(isValidCoord(13.7, 100.5)).toBe(true);
    expect(isValidCoord(91, 100)).toBe(false);
    expect(isValidCoord(NaN, 100)).toBe(false);
  });
});
