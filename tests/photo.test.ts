import { describe, expect, it } from 'vitest';
import { photoUrl, sniffImageType } from '@/lib/photo';

describe('sniffImageType', () => {
  it('detects jpeg, png, webp by magic bytes', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
  });
  it('rejects other content', () => {
    expect(sniffImageType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe('photoUrl', () => {
  it('is null without a photo and versioned with one', () => {
    expect(photoUrl({ id: 3, photoUpdatedAt: null })).toBeNull();
    expect(photoUrl({ id: 3, photoUpdatedAt: new Date(1000) })).toBe('/api/photo/3?v=1000');
  });
});
