import { describe, it, expect } from 'vitest';
import { faviconCandidates, normalizeUrlKey, sortSnapshots } from '../lib/utils';

describe('faviconCandidates', () => {
  it('returns extension favicon and Google favicon URLs', () => {
    const result = faviconCandidates('https://example.com');
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('/_favicon/');
    expect(result[0]).toContain(encodeURIComponent('https://example.com'));
    expect(result[1]).toContain('google.com/s2/favicons');
  });
});

describe('normalizeUrlKey', () => {
  it('normalizes a standard URL', () => {
    expect(normalizeUrlKey('https://Example.COM/path/')).toBe('https://example.com/path');
  });

  it('preserves query strings', () => {
    expect(normalizeUrlKey('https://example.com/page?q=test')).toBe('https://example.com/page?q=test');
  });

  it('does not strip trailing slash on root path', () => {
    expect(normalizeUrlKey('https://example.com/')).toBe('https://example.com/');
  });

  it('handles invalid URLs gracefully', () => {
    expect(normalizeUrlKey('not a url')).toBe('not a url');
    expect(normalizeUrlKey('')).toBe('');
    expect(normalizeUrlKey(null)).toBe('');
    expect(normalizeUrlKey(undefined)).toBe('');
  });

  it('lowercases hostname', () => {
    expect(normalizeUrlKey('https://GitHub.COM/repo')).toBe('https://github.com/repo');
  });
});

describe('sortSnapshots', () => {
  it('sorts items by parentId then index', () => {
    const items = [
      { parentId: 'b', index: 1 },
      { parentId: 'a', index: 2 },
      { parentId: 'a', index: 0 },
      { parentId: 'b', index: 0 }
    ];
    const sorted = sortSnapshots(items);
    expect(sorted.map((i) => `${i.parentId}-${i.index}`)).toEqual(['a-0', 'a-2', 'b-0', 'b-1']);
  });

  it('does not mutate the original array', () => {
    const items = [
      { parentId: 'b', index: 1 },
      { parentId: 'a', index: 0 }
    ];
    const sorted = sortSnapshots(items);
    expect(sorted).not.toBe(items);
    expect(items[0].parentId).toBe('b');
  });

  it('handles missing index values', () => {
    const items = [
      { parentId: 'a' },
      { parentId: 'a', index: 1 }
    ];
    const sorted = sortSnapshots(items);
    expect(sorted[0].index).toBeUndefined();
    expect(sorted[1].index).toBe(1);
  });
});
