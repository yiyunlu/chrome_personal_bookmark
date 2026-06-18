import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCollectionsPayload,
  exportCollections,
  importCollections,
  ensureTrashFolder,
  ensureTabHubRootFolder,
  subscribeBookmarksChanges
} from '../lib/bookmarkService';

// Helper to build a minimal bookmark tree for the Chrome mock.
// Chrome's getTree returns [rootNode] where rootNode.children are the top-level
// bookmark bar, other bookmarks, etc.
function buildTree(barChildren = []) {
  return [
    {
      id: '0',
      title: '',
      children: [
        {
          id: '1',
          title: 'Bookmarks Bar',
          children: barChildren
        }
      ]
    }
  ];
}

// Utility: recursively find a node by id in the mock tree
function findById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// bookmarkService.js binds Chrome API functions at module load time via
// promisifyChromeApi(fn.bind(...)). Because .bind() captures the function
// reference, reassigning chrome.bookmarks.getTree in tests has no effect.
// Instead, setup.js uses a _impl dispatch pattern: calling
// chrome.bookmarks.getTree(...) delegates to chrome.bookmarks.getTree._impl(...).
// Tests swap _impl to change behavior.

describe('bookmarkService', () => {
  let idCounter;
  let createCalls;

  beforeEach(() => {
    idCounter = 100;
    createCalls = [];
    chrome.runtime.lastError = null;

    // Default _impl: getTree returns an empty bookmarks bar
    chrome.bookmarks.getTree._impl = (cb) => cb(buildTree([]));

    // Default _impl: getSubTree returns a stub
    chrome.bookmarks.getSubTree._impl = (id, cb) => {
      cb([{ id, children: [] }]);
    };

    // Default _impl: create returns a new node with an auto-incremented id
    chrome.bookmarks.create._impl = (props, cb) => {
      createCalls.push(props);
      const node = { id: String(++idCounter), ...props, children: [] };
      cb(node);
    };

    chrome.bookmarks.move._impl = (id, dest, cb) => cb({ id, ...dest });
    chrome.bookmarks.update._impl = (id, changes, cb) => cb({ id, ...changes });
    chrome.bookmarks.removeTree._impl = (_id, cb) => cb();
  });

  // Helper: set up both getTree and getSubTree to serve a given tree
  function setMockTree(tree) {
    chrome.bookmarks.getTree._impl = (cb) => cb(tree);
    chrome.bookmarks.getSubTree._impl = (id, cb) => {
      const node = findById(tree, id);
      cb(node ? [node] : [{ id, children: [] }]);
    };
  }

  // ── getCollectionsPayload ────────────────────────────────────

  describe('getCollectionsPayload', () => {
    it('returns sources, collections, and cards from a bookmark tree', async () => {
      const tree = buildTree([
        {
          id: '10',
          title: 'TabHub',
          children: [
            {
              id: '20',
              title: 'Development',
              children: [
                { id: '30', title: 'GitHub', url: 'https://github.com', parentId: '20', index: 0 },
                { id: '31', title: 'MDN', url: 'https://developer.mozilla.org', parentId: '20', index: 1 }
              ]
            },
            {
              id: '21',
              title: 'Reading',
              children: [
                { id: '32', title: 'Medium', url: 'https://medium.com', parentId: '21', index: 0 }
              ]
            }
          ]
        }
      ]);

      setMockTree(tree);

      const result = await getCollectionsPayload();

      expect(result.sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: '10', title: 'TabHub', isTabHub: true })
        ])
      );

      expect(result.sources).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: '1' })])
      );

      expect(result.tabHubRootId).toBe('10');
      expect(result.activeSourceId).toBeDefined();
    });

    it('returns collections with cards when a preferred source is specified', async () => {
      const tree = buildTree([
        {
          id: '10',
          title: 'TabHub',
          children: [
            {
              id: '20',
              title: 'Dev',
              children: [
                { id: '30', title: 'GH', url: 'https://github.com', parentId: '20', index: 0 }
              ]
            }
          ]
        }
      ]);

      setMockTree(tree);

      const result = await getCollectionsPayload('1');

      expect(result.collections).toBeDefined();
      expect(Array.isArray(result.collections)).toBe(true);
      expect(result.activeSourceId).toBe('1');
    });

    it('hides the trash folder from collections', async () => {
      const tree = buildTree([
        {
          id: '10',
          title: 'TabHub',
          children: [
            {
              id: '20',
              title: 'Dev',
              children: []
            },
            {
              id: '99',
              title: '.TabHub Trash',
              children: [
                { id: '50', title: 'Deleted', url: 'https://deleted.com', parentId: '99', index: 0 }
              ]
            }
          ]
        }
      ]);

      setMockTree(tree);

      const result = await getCollectionsPayload('10');

      expect(result.trashFolderId).toBe('99');

      const trashCollection = result.collections.find((c) => c.folderTitle === '.TabHub Trash');
      expect(trashCollection).toBeUndefined();
    });

    it('creates the TabHub root if it does not exist', async () => {
      const emptyTree = buildTree([]);
      const populatedTree = buildTree([
        { id: '101', title: 'TabHub', children: [] }
      ]);

      let callCount = 0;
      chrome.bookmarks.getTree._impl = (cb) => {
        callCount++;
        cb(callCount <= 2 ? emptyTree : populatedTree);
      };
      chrome.bookmarks.getSubTree._impl = (id, cb) => {
        const node = findById(populatedTree, id);
        cb(node ? [node] : [{ id, children: [] }]);
      };

      const result = await getCollectionsPayload();

      expect(createCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'TabHub' })
        ])
      );
      expect(result.tabHubRootId).toBeDefined();
    });

    it('includes collections with their bookmark cards', async () => {
      const tree = buildTree([
        {
          id: '10',
          title: 'TabHub',
          children: [
            {
              id: '20',
              title: 'Development',
              children: [
                { id: '30', title: 'GitHub', url: 'https://github.com', parentId: '20', index: 0 },
                { id: '31', title: 'MDN', url: 'https://developer.mozilla.org', parentId: '20', index: 1 }
              ]
            }
          ]
        }
      ]);

      setMockTree(tree);

      const result = await getCollectionsPayload('10');

      const devCollection = result.collections.find((c) => c.folderTitle === 'Development');
      expect(devCollection).toBeDefined();
      expect(devCollection.cards).toHaveLength(2);
      expect(devCollection.cards[0]).toEqual(
        expect.objectContaining({ id: '30', title: 'GitHub', url: 'https://github.com' })
      );
      expect(devCollection.cards[1]).toEqual(
        expect.objectContaining({ id: '31', title: 'MDN', url: 'https://developer.mozilla.org' })
      );
    });
  });

  // ── exportCollections ────────────────────────────────────────

  describe('exportCollections', () => {
    it('returns valid JSON with version, date, and collections', () => {
      const collections = [
        {
          folderTitle: 'Development',
          title: 'Source / Development',
          cards: [
            { title: 'GitHub', url: 'https://github.com' },
            { title: 'MDN', url: 'https://developer.mozilla.org' }
          ]
        },
        {
          folderTitle: 'Reading',
          title: 'Source / Reading',
          cards: [{ title: 'Medium', url: 'https://medium.com' }]
        }
      ];

      const json = exportCollections(collections);
      const data = JSON.parse(json);

      expect(data.version).toBe(1);
      expect(data.exportedAt).toBeDefined();
      expect(data.collections).toHaveLength(2);
      expect(data.collections[0].title).toBe('Development');
      expect(data.collections[0].cards).toHaveLength(2);
      expect(data.collections[0].cards[0]).toEqual({ title: 'GitHub', url: 'https://github.com' });
      expect(data.collections[1].title).toBe('Reading');
      expect(data.collections[1].cards).toHaveLength(1);
    });

    it('uses folderTitle over title if available', () => {
      const collections = [
        {
          folderTitle: 'FolderName',
          title: 'Source / FolderName',
          cards: []
        }
      ];

      const data = JSON.parse(exportCollections(collections));
      expect(data.collections[0].title).toBe('FolderName');
    });

    it('strips extra card fields from export', () => {
      const collections = [
        {
          folderTitle: 'Test',
          cards: [
            { id: 'x', title: 'Foo', url: 'https://foo.com', parentId: '1', index: 0 }
          ]
        }
      ];

      const data = JSON.parse(exportCollections(collections));
      const card = data.collections[0].cards[0];
      expect(card).toEqual({ title: 'Foo', url: 'https://foo.com' });
      expect(card.id).toBeUndefined();
      expect(card.parentId).toBeUndefined();
    });

    it('handles empty collections array', () => {
      const data = JSON.parse(exportCollections([]));
      expect(data.version).toBe(1);
      expect(data.collections).toEqual([]);
    });
  });

  // ── importCollections ────────────────────────────────────────

  describe('importCollections', () => {
    it('creates folders and bookmarks from valid JSON', async () => {
      const input = JSON.stringify({
        version: 1,
        collections: [
          {
            title: 'Development',
            cards: [
              { title: 'GitHub', url: 'https://github.com' },
              { title: 'MDN', url: 'https://developer.mozilla.org' }
            ]
          },
          {
            title: 'Reading',
            cards: [{ title: 'Medium', url: 'https://medium.com' }]
          }
        ]
      });

      const result = await importCollections(input, 'root-parent');

      expect(result.collectionsCreated).toBe(2);
      expect(result.bookmarksCreated).toBe(3);

      expect(createCalls[0]).toEqual(
        expect.objectContaining({ parentId: 'root-parent', title: 'Development' })
      );
    });

    it('throws on invalid JSON', async () => {
      await expect(importCollections('not-json', 'p')).rejects.toThrow('Invalid JSON');
    });

    it('throws on missing collections array', async () => {
      await expect(importCollections('{"version":1}', 'p')).rejects.toThrow('Invalid import file format');
    });

    it('uses fallback title for collections without title', async () => {
      const input = JSON.stringify({
        version: 1,
        collections: [{ cards: [] }]
      });

      await importCollections(input, 'parent');

      expect(createCalls[0]).toEqual(
        expect.objectContaining({ title: 'Untitled' })
      );
    });

    it('skips cards without a url', async () => {
      const input = JSON.stringify({
        version: 1,
        collections: [
          {
            title: 'Test',
            cards: [
              { title: 'No URL' },
              { title: 'Has URL', url: 'https://example.com' }
            ]
          }
        ]
      });

      const result = await importCollections(input, 'parent');

      expect(result.collectionsCreated).toBe(1);
      expect(result.bookmarksCreated).toBe(1);
    });

    it('handles collections with no cards array', async () => {
      const input = JSON.stringify({
        version: 1,
        collections: [{ title: 'EmptyCol' }]
      });

      const result = await importCollections(input, 'parent');

      expect(result.collectionsCreated).toBe(1);
      expect(result.bookmarksCreated).toBe(0);
    });
  });

  // ── ensureTrashFolder ────────────────────────────────────────

  describe('ensureTrashFolder', () => {
    it('returns existing trash folder if found', async () => {
      chrome.bookmarks.getSubTree._impl = (_id, cb) =>
        cb([
          {
            id: 'root',
            children: [
              { id: '50', title: '.TabHub Trash', children: [] },
              { id: '51', title: 'Dev', children: [] }
            ]
          }
        ]);

      const result = await ensureTrashFolder('root');
      expect(result.id).toBe('50');
      expect(result.title).toBe('.TabHub Trash');
      expect(createCalls).toHaveLength(0);
    });

    it('creates a new trash folder if not found', async () => {
      chrome.bookmarks.getSubTree._impl = (_id, cb) =>
        cb([
          {
            id: 'root',
            children: [
              { id: '51', title: 'Dev', children: [] }
            ]
          }
        ]);

      const result = await ensureTrashFolder('root');
      expect(createCalls).toEqual([
        { parentId: 'root', title: '.TabHub Trash' }
      ]);
      expect(result.title).toBe('.TabHub Trash');
    });

    it('ignores url nodes when searching for trash folder', async () => {
      chrome.bookmarks.getSubTree._impl = (_id, cb) =>
        cb([
          {
            id: 'root',
            children: [
              { id: '60', title: '.TabHub Trash', url: 'https://trash.com' }
            ]
          }
        ]);

      await ensureTrashFolder('root');
      expect(createCalls.length).toBeGreaterThan(0);
    });
  });

  // ── ensureTabHubRootFolder ───────────────────────────────────

  describe('ensureTabHubRootFolder', () => {
    it('returns existing TabHub folder if found', async () => {
      const tree = buildTree([{ id: '10', title: 'TabHub', children: [] }]);
      chrome.bookmarks.getTree._impl = (cb) => cb(tree);

      const result = await ensureTabHubRootFolder();
      expect(result.id).toBe('10');
      expect(createCalls).toHaveLength(0);
    });

    it('creates TabHub folder under bookmarks bar if not found', async () => {
      const tree = buildTree([]);
      chrome.bookmarks.getTree._impl = (cb) => cb(tree);

      const result = await ensureTabHubRootFolder();
      expect(createCalls).toEqual([
        { parentId: '1', title: 'TabHub' }
      ]);
      expect(result.title).toBe('TabHub');
    });

    it('finds TabHub folder case-insensitively', async () => {
      const tree = buildTree([{ id: '10', title: '  tabhub  ', children: [] }]);
      chrome.bookmarks.getTree._impl = (cb) => cb(tree);

      const result = await ensureTabHubRootFolder();
      expect(result.id).toBe('10');
      expect(createCalls).toHaveLength(0);
    });
  });

  // ── subscribeBookmarksChanges ────────────────────────────────

  describe('subscribeBookmarksChanges', () => {
    it('registers listeners on all bookmark events', () => {
      chrome.bookmarks.onCreated.addListener = vi.fn();
      chrome.bookmarks.onRemoved.addListener = vi.fn();
      chrome.bookmarks.onChanged.addListener = vi.fn();
      chrome.bookmarks.onMoved.addListener = vi.fn();
      chrome.bookmarks.onChildrenReordered.addListener = vi.fn();

      subscribeBookmarksChanges(() => {});

      expect(chrome.bookmarks.onCreated.addListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onRemoved.addListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onChanged.addListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onMoved.addListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onChildrenReordered.addListener).toHaveBeenCalled();
    });

    it('returns an unsubscribe function that removes listeners', () => {
      chrome.bookmarks.onCreated.addListener = vi.fn();
      chrome.bookmarks.onCreated.removeListener = vi.fn();
      chrome.bookmarks.onRemoved.addListener = vi.fn();
      chrome.bookmarks.onRemoved.removeListener = vi.fn();
      chrome.bookmarks.onChanged.addListener = vi.fn();
      chrome.bookmarks.onChanged.removeListener = vi.fn();
      chrome.bookmarks.onMoved.addListener = vi.fn();
      chrome.bookmarks.onMoved.removeListener = vi.fn();
      chrome.bookmarks.onChildrenReordered.addListener = vi.fn();
      chrome.bookmarks.onChildrenReordered.removeListener = vi.fn();

      const unsubscribe = subscribeBookmarksChanges(() => {});
      unsubscribe();

      expect(chrome.bookmarks.onCreated.removeListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onRemoved.removeListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onChanged.removeListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onMoved.removeListener).toHaveBeenCalled();
      expect(chrome.bookmarks.onChildrenReordered.removeListener).toHaveBeenCalled();
    });
  });
});
