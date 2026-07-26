import { describe, expect, it } from 'vitest';

import { cn, formatDate, mediaUrl, percent } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and de-duplicates conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', false, 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('percent', () => {
  it('formats a 0..1 value as a percentage', () => {
    expect(percent(0.5562)).toBe('55.6%');
    expect(percent(1, 0)).toBe('100%');
  });
});

describe('formatDate', () => {
  it('returns a non-empty human string', () => {
    expect(formatDate('2026-07-23T10:00:00Z')).toMatch(/2026/);
  });
});

describe('mediaUrl', () => {
  it('passes through absolute URLs', () => {
    expect(mediaUrl('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
  });
  it('prefixes relative media paths with the API origin', () => {
    expect(mediaUrl('/media/gradcam/x.png')).toContain('/media/gradcam/x.png');
  });
});
