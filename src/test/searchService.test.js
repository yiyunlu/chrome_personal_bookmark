import { describe, it, expect } from 'vitest';
import { smartSearch } from '../lib/searchService';

const bookmarks = [
  { id: '1', title: 'React Tutorial', url: 'https://reactjs.org/tutorial', collectionTitle: 'Development' },
  { id: '2', title: 'My GitHub Repo', url: 'https://github.com/user/repo', collectionTitle: 'Development' },
  { id: '3', title: 'Twitter Feed', url: 'https://twitter.com/home', collectionTitle: 'Social' },
  { id: '4', title: 'Amazon Shopping', url: 'https://amazon.com/deals', collectionTitle: 'Shopping' },
  { id: '5', title: 'YouTube Video', url: 'https://youtube.com/watch?v=123', collectionTitle: 'Media' },
  { id: '6', title: 'Figma Design File', url: 'https://figma.com/file/abc', collectionTitle: 'Design' },
  { id: '7', title: 'Medium Article on Vue', url: 'https://medium.com/vue-article', collectionTitle: 'Reading' },
  { id: '8', title: 'Stack Overflow Question', url: 'https://stackoverflow.com/q/123', collectionTitle: 'Development' }
];

describe('smartSearch', () => {
  it('returns empty for empty query', () => {
    expect(smartSearch('', bookmarks)).toEqual([]);
    expect(smartSearch('  ', bookmarks)).toEqual([]);
  });

  it('matches exact title substring', () => {
    const results = smartSearch('React', bookmarks);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].bookmark.id).toBe('1');
    expect(results[0].score).toBe(1);
  });

  it('matches URL content', () => {
    const results = smartSearch('github', bookmarks);
    expect(results.some((r) => r.bookmark.id === '2')).toBe(true);
  });

  it('matches collection title', () => {
    const results = smartSearch('Shopping', bookmarks);
    expect(results.some((r) => r.bookmark.id === '4')).toBe(true);
  });

  // These fixtures match ONLY via category expansion: the query shares no
  // substring/fuzzy overlap with title, URL, or collection, so the tests fail
  // if the expansion feature is removed.
  it('expands "social media" to platform keywords', () => {
    const bookmark = { id: '9', title: '推文时间线', url: 'https://twitter.com/timeline', collectionTitle: 'Misc' };
    const results = smartSearch('social media', [bookmark]);
    expect(results).toHaveLength(1);
    expect(results[0].matchReason).toBe('语义匹配');
  });

  it('expands "dev tools" to development keywords', () => {
    const bookmark = { id: '10', title: 'GitHub 主页', url: 'https://github.com', collectionTitle: '常用' };
    const results = smartSearch('dev tools', [bookmark]);
    expect(results).toHaveLength(1);
    expect(results[0].matchReason).toBe('语义匹配');
  });

  it('performs fuzzy matching', () => {
    const results = smartSearch('reac', bookmarks);
    expect(results.some((r) => r.bookmark.id === '1')).toBe(true);
  });

  it('ranks exact matches higher than fuzzy', () => {
    const results = smartSearch('React', bookmarks);
    const exact = results.find((r) => r.bookmark.id === '1');
    expect(exact.score).toBe(1);
  });

  it('handles queries that match nothing', () => {
    const results = smartSearch('xyznonexistent', bookmarks);
    expect(results).toEqual([]);
  });

  it('is case insensitive', () => {
    const results = smartSearch('YOUTUBE', bookmarks);
    expect(results.some((r) => r.bookmark.id === '5')).toBe(true);
  });

  it('returns results sorted by score descending', () => {
    const results = smartSearch('design', bookmarks);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });
});
