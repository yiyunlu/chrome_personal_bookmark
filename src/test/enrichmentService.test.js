import { describe, it, expect } from 'vitest';
import { generateTags, extractDomain, enrichBookmarks } from '../lib/enrichmentService';

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
