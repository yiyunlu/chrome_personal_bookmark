import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkLink, checkDeadLinks, generateTags, extractDomain, enrichBookmarks } from '../lib/enrichmentService';

describe('checkLink', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports a confirmed-dead link when the server exposes its status via CORS', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    await expect(checkLink('https://example.com/gone')).resolves.toMatchObject({
      alive: false,
      status: 404,
      error: 'HTTP 404',
      linkStatus: 'dead'
    });
  });

  it('reports alive with real status for reachable CORS hosts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })));
    await expect(checkLink('https://example.com')).resolves.toMatchObject({
      alive: true,
      status: 200,
      linkStatus: 'alive'
    });
  });

  it('retries with GET when the server rejects HEAD', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(checkLink('https://example.com')).resolves.toMatchObject({ alive: true, linkStatus: 'alive' });
    expect(fetchMock.mock.calls[1][1].method).toBe('GET');
  });

  it('treats a CORS-blocked but reachable host as unverifiable, never dead', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ type: 'opaque' });
    vi.stubGlobal('fetch', fetchMock);
    await expect(checkLink('https://no-cors-host.example')).resolves.toMatchObject({ linkStatus: 'unknown' });
    expect(fetchMock.mock.calls[1][1].mode).toBe('no-cors');
  });

  it('reports unknown (not dead) when both probes fail — the status is unverifiable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(checkLink('https://gone.invalid')).resolves.toMatchObject({
      alive: false,
      status: null,
      linkStatus: 'unknown'
    });
  });
});

describe('checkDeadLinks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('checks all bookmarks in batches and reports progress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => (url.includes('dead') ? { ok: false, status: 404 } : { ok: true, status: 200 }))
    );
    const bookmarks = Array.from({ length: 6 }, (_, i) => ({
      id: `b${i}`,
      title: `Bookmark ${i}`,
      url: i === 3 ? 'https://dead.example/page' : `https://ok.example/${i}`
    }));
    const progress = [];
    const results = await checkDeadLinks(bookmarks, (p) => progress.push(p));

    expect(results).toHaveLength(6);
    expect(results.filter((r) => !r.alive).map((r) => r.bookmarkId)).toEqual(['b3']);
    expect(progress.map((p) => p.checked)).toEqual([5, 6]);
    expect(progress.every((p) => p.total === 6)).toBe(true);
  });
});

describe('extractDomain', () => {
  it('extracts domain from URL', () => {
    expect(extractDomain('https://github.com/user/repo')).toBe('github.com');
  });

  it('strips www prefix', () => {
    expect(extractDomain('https://www.example.com/page')).toBe('example.com');
  });

  it('returns empty string for invalid URL', () => {
    expect(extractDomain('not a url')).toBe('');
    expect(extractDomain('')).toBe('');
  });
});

describe('generateTags', () => {
  it('generates tags for GitHub URLs', () => {
    const tags = generateTags({ title: 'My Repo', url: 'https://github.com/user/repo' });
    expect(tags).toContain('开发');
    expect(tags).toContain('GitHub');
  });

  it('generates tags for YouTube URLs', () => {
    const tags = generateTags({ title: 'Cool Video', url: 'https://youtube.com/watch?v=123' });
    expect(tags).toContain('视频');
  });

  it('generates tags from title keywords', () => {
    const tags = generateTags({ title: 'React Tutorial', url: 'https://example.com' });
    expect(tags).toContain('React');
    expect(tags).toContain('教程');
  });

  it('combines URL and title tags', () => {
    const tags = generateTags({ title: 'Python API Guide', url: 'https://docs.example.com/api' });
    expect(tags).toContain('文档');
    expect(tags).toContain('Python');
    expect(tags).toContain('API');
    expect(tags).toContain('指南');
  });

  it('returns empty array for unrecognized bookmarks', () => {
    const tags = generateTags({ title: 'Random Page', url: 'https://random.xyz' });
    expect(tags).toEqual([]);
  });

  it('deduplicates tags', () => {
    const tags = generateTags({ title: 'Dev Blog', url: 'https://dev.to/post' });
    const uniqueTags = [...new Set(tags)];
    expect(tags.length).toBe(uniqueTags.length);
  });
});

describe('enrichBookmarks', () => {
  it('enriches multiple bookmarks', () => {
    const bookmarks = [
      { id: '1', title: 'GitHub Repo', url: 'https://github.com/user/repo' },
      { id: '2', title: 'Random Page', url: 'https://random.xyz' }
    ];

    const enriched = enrichBookmarks(bookmarks);
    expect(enriched).toHaveLength(2);
    expect(enriched[0].bookmarkId).toBe('1');
    expect(enriched[0].domain).toBe('github.com');
    expect(enriched[0].tags).toContain('GitHub');
    expect(enriched[1].tags).toEqual([]);
    expect(enriched[1].domain).toBe('random.xyz');
  });
});
