import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { categorizeBookmarks, getApiKey, setApiKey } from '../lib/aiService';

describe('aiService', () => {
  beforeEach(() => {
    // Reset chrome.storage.local mock for each test
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({}));
    chrome.storage.local.set = vi.fn((_obj, cb) => cb());
  });

  describe('getApiKey', () => {
    it('returns empty string when no key stored', async () => {
      const key = await getApiKey();
      expect(key).toBe('');
    });

    it('returns stored key', async () => {
      chrome.storage.local.get = vi.fn((_keys, cb) => cb({ tabhub_ai_api_key: 'test-api-key-123' }));
      const key = await getApiKey();
      expect(key).toBe('test-api-key-123');
    });
  });

  describe('setApiKey', () => {
    it('stores the key via chrome.storage.local', async () => {
      await setApiKey('test-api-key-new');
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { tabhub_ai_api_key: 'test-api-key-new' },
        expect.any(Function)
      );
    });
  });

  describe('categorizeBookmarks (mock mode)', () => {
    const existingCollections = [
      { id: 'c1', title: 'Development' },
      { id: 'c2', title: 'Reading' }
    ];

    it('categorizes github.com bookmarks to Development', async () => {
      const bookmarks = [
        { id: 'b1', title: 'My Repo', url: 'https://github.com/user/repo', currentCollection: 'Unfiled' }
      ];

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].bookmarkId).toBe('b1');
      expect(result.suggestions[0].targetCollectionTitle).toBe('Development');
    });

    it('categorizes medium.com bookmarks to Reading', async () => {
      const bookmarks = [
        { id: 'b2', title: 'An Article', url: 'https://medium.com/some-article', currentCollection: 'Unfiled' }
      ];

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].targetCollectionTitle).toBe('Reading');
    });

    it('does not suggest moving if bookmark is already in the right collection', async () => {
      const bookmarks = [
        { id: 'b3', title: 'GitHub Repo', url: 'https://github.com/user/repo', currentCollection: 'Development' }
      ];

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result.suggestions).toHaveLength(0);
    });

    it('categorizes by title keywords when domain is unknown', async () => {
      const bookmarks = [
        { id: 'b4', title: 'React Tutorial for Beginners', url: 'https://somesite.com/react', currentCollection: 'Unfiled' }
      ];

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].targetCollectionTitle).toBe('Development');
    });

    it('suggests new collections when no existing match', async () => {
      const bookmarks = [
        { id: 'b5', title: 'Cool Design', url: 'https://dribbble.com/shots/123', currentCollection: 'Unfiled' }
      ];

      const result = await categorizeBookmarks(bookmarks, []);
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].targetCollectionTitle).toBe('Design');
      expect(result.newCollections).toContain('Design');
    });

    it('skips bookmarks that cannot be categorized', async () => {
      const bookmarks = [
        { id: 'b6', title: 'Random Page', url: 'https://random-unknown-site.xyz/page', currentCollection: 'Unfiled' }
      ];

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result.suggestions).toHaveLength(0);
    });

    it('handles multiple bookmarks', async () => {
      const bookmarks = [
        { id: 'b1', title: 'Repo', url: 'https://github.com/user/repo', currentCollection: 'Unfiled' },
        { id: 'b2', title: 'Article', url: 'https://medium.com/article', currentCollection: 'Unfiled' },
        { id: 'b3', title: 'Random', url: 'https://random.xyz', currentCollection: 'Unfiled' }
      ];

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result.suggestions).toHaveLength(2); // github + medium, random skipped
    });
  });

  describe('categorizeBookmarks (Claude API mode)', () => {
    const bookmarks = [
      { id: 'b1', title: 'Repo', url: 'https://github.com/user/repo', currentCollection: 'Unfiled' },
      { id: 'b2', title: 'Article', url: 'https://medium.com/article', currentCollection: 'Unfiled' }
    ];
    const existingCollections = [{ id: 'c1', title: 'Development' }];

    const claudeResponse = (payload) => ({
      ok: true,
      json: async () => ({ content: [{ text: `Here you go:\n${JSON.stringify(payload)}` }] })
    });

    beforeEach(() => {
      chrome.storage.local.get = vi.fn((_keys, cb) => cb({ tabhub_ai_api_key: 'test-api-key' }));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('sends real bookmark ids in the prompt so the model can echo them back', async () => {
      const fetchMock = vi.fn(async () => claudeResponse({ suggestions: [], newCollections: [] }));
      vi.stubGlobal('fetch', fetchMock);

      await categorizeBookmarks(bookmarks, existingCollections);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const prompt = body.messages[0].content;
      expect(prompt).toContain('id:b1');
      expect(prompt).toContain('id:b2');
    });

    it('drops suggestions whose bookmarkId was not in the request (hallucinated ids)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          claudeResponse({
            suggestions: [
              { bookmarkId: 'b1', targetCollectionTitle: 'Development', reason: 'code' },
              { bookmarkId: '1', targetCollectionTitle: 'Development', reason: 'hallucinated id' },
              { bookmarkId: 'b2', targetCollectionTitle: '', reason: 'empty target' }
            ],
            newCollections: ['Reading', 42, '  ']
          })
        )
      );

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result.suggestions).toEqual([{ bookmarkId: 'b1', targetCollectionTitle: 'Development', reason: 'code' }]);
      expect(result.newCollections).toEqual(['Reading']);
    });

    it('tolerates a malformed shape by returning empty lists instead of crashing the apply flow', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => claudeResponse({ suggestions: 'nope' })));

      const result = await categorizeBookmarks(bookmarks, existingCollections);
      expect(result).toEqual({ suggestions: [], newCollections: [] });
    });

    it('throws when the response contains no JSON at all', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ text: 'sorry, no JSON' }] }) }))
      );

      await expect(categorizeBookmarks(bookmarks, existingCollections)).rejects.toThrow('Failed to parse AI response');
    });

    it('surfaces API errors with status code', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' })));

      await expect(categorizeBookmarks(bookmarks, existingCollections)).rejects.toThrow('Claude API error: 401');
    });
  });
});
