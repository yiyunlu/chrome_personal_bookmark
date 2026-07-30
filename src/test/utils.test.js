import { describe, it, expect } from 'vitest';
import { faviconCandidates, normalizeUrlKey, sortSnapshots } from '../lib/utils';

describe('faviconCandidates', () => {
  it('returns extension favicon and a domain-only Google fallback', () => {
    const result = faviconCandidates('https://example.com/secret/path?token=abc');
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('/_favicon/');
    expect(result[0]).toContain(encodeURIComponent('https://example.com/secret/path?token=abc'));
    expect(result[1]).toContain('google.com/s2/favicons');
    // The third-party fallback must never receive the full URL.
    expect(result[1]).toContain('domain=example.com');
    expect(result[1]).not.toContain('secret');
    expect(result[1]).not.toContain('token');
  });

  it('skips the external fallback for unparseable URLs', () => {
    const result = faviconCandidates('not a url');
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('/_favicon/');
  });
});

describe('normalizeUrlKey', () => {
  it('strips the protocol and normalizes a standard URL', () => {
    expect(normalizeUrlKey('https://Example.COM/path/')).toBe('example.com/path');
  });

  it('treats http and https variants as the same key', () => {
    expect(normalizeUrlKey('http://example.com/a')).toBe(normalizeUrlKey('https://example.com/a'));
  });

  it('preserves query strings', () => {
    expect(normalizeUrlKey('https://example.com/page?q=test')).toBe('example.com/page?q=test');
  });

  it('preserves path/query case (URL paths are case-sensitive)', () => {
    expect(normalizeUrlKey('https://github.com/User/Repo')).not.toBe(normalizeUrlKey('https://github.com/user/repo'));
  });

  it('does not strip trailing slash on root path', () => {
    expect(normalizeUrlKey('https://example.com/')).toBe('example.com/');
  });

  it('handles invalid URLs gracefully', () => {
    expect(normalizeUrlKey('not a url')).toBe('not a url');
    expect(normalizeUrlKey('')).toBe('');
    expect(normalizeUrlKey(null)).toBe('');
    expect(normalizeUrlKey(undefined)).toBe('');
  });

  it('lowercases hostname', () => {
    expect(normalizeUrlKey('https://GitHub.COM/repo')).toBe('github.com/repo');
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
