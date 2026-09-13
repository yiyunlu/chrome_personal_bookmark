import { describe, it, expect } from 'vitest';
import { identity, identityChar, identityTint, identityForUrl } from '../lib/identity';

describe('identity', () => {
  it('is stable — the same key always yields the same tint', () => {
    expect(identityTint('Local Network')).toBe(identityTint('Local Network'));
    expect(identityTint('a')).not.toBe(identityTint('a '));
  });

  it('spreads across the palette rather than collapsing onto one colour', () => {
    const names = ['书签栏', 'Local Network', 'Cloud Services', 'Canada', 'My Sites',
                   'Learning', 'RUN', 'Trading', 'FUN', '自由项目', 'KIDs', 'GAME'];
    const tints = new Set(names.map(identityTint));
    // 12 names over a 9-colour palette: collisions are expected, a single
    // bucket is not.
    expect(tints.size).toBeGreaterThanOrEqual(6);
  });

  it('takes one glyph for CJK and initials for Latin', () => {
    expect(identityChar('自由项目')).toBe('自');
    expect(identityChar('智能服务平台')).toBe('大');
    expect(identityChar('Local Network')).toBe('LN');
    expect(identityChar('Global Finance Corp')).toBe('GF');
    expect(identityChar('YouTube')).toBe('Yo');
  });

  it('never returns an empty marker', () => {
    for (const input of ['', '   ', null, undefined, '///', '···']) {
      expect(identityChar(input).length).toBeGreaterThan(0);
    }
  });

  it('derives a bookmark from its host, so one site reads as one group', () => {
    const a = identityForUrl('https://github.com/user/repo', 'HKUDS/ViMax');
    const b = identityForUrl('https://github.com/other/thing', 'tw93/Mole');
    expect(a).toEqual(b);
  });

  it('drops the public suffix and the www', () => {
    expect(identityForUrl('https://one.dash.cloudflare.com', 'x').char).toBe('Cl');
    expect(identityForUrl('https://www.youtube.com', 'x')).toEqual(
      identityForUrl('https://youtube.com', 'x')
    );
  });

  it('keeps the last octet of a LAN address, which is what distinguishes boxes', () => {
    expect(identityForUrl('http://192.0.2.10/', 'Git Server').char).toBe('10');
    expect(identityForUrl('http://192.0.2.11/', 'Media Server').char).toBe('11');
  });

  it('falls back to the title when the URL will not parse', () => {
    expect(identityForUrl('not a url', '小红书创作服务平台')).toEqual(identity('小红书创作服务平台'));
  });
});
