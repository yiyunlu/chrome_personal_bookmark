import { describe, it, expect, beforeEach } from 'vitest';
import { planBookmarkSortMoves, sortFolderBookmarks } from '@/lib/bookmarkService';

// Mirrors Chrome's chrome.bookmarks.move index semantics (index evaluated before removal).
function applyChromeMoves(children, moves) {
  const list = [...children];
  for (const move of moves) {
    const oldIdx = list.findIndex((node) => node.id === move.id);
    if (oldIdx === -1) throw new Error(`Unknown id: ${move.id}`);
    const target = move.index ?? list.length;
    const [item] = list.splice(oldIdx, 1);
    const adjusted = target > oldIdx ? target - 1 : target;
    list.splice(adjusted, 0, item);
  }
  return list;
}

function card(id, title, url = `https://${id}.example`) {
  return { id, title, url };
}

function folder(id, title = id) {
  return { id, title };
}

describe('planBookmarkSortMoves (issue #27)', () => {
  it('returns no moves when bookmarks are already sorted', () => {
    const children = [folder('f1'), card('a', 'Alpha'), folder('f2'), card('b', 'Beta')];
    expect(planBookmarkSortMoves(children)).toEqual([]);
  });

  it('sorts bookmarks in a folder without subfolders', () => {
    const children = [card('c', 'Charlie'), card('a', 'Alpha'), card('b', 'Beta')];
    const moves = planBookmarkSortMoves(children);
    const result = applyChromeMoves(children, moves);
    expect(result.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('preserves leading, interleaved, and trailing subfolder positions while sorting bookmarks', () => {
    const children = [
      folder('f1', 'Leading'),
      card('c', 'Charlie'),
      folder('f2', 'Middle'),
      card('b', 'Beta'),
      card('a', 'Alpha'),
      folder('f3', 'Trailing')
    ];

    const moves = planBookmarkSortMoves(children);
    // Never moves a folder
    expect(moves.every((m) => !m.id.startsWith('f'))).toBe(true);

    const result = applyChromeMoves(children, moves);
    expect(result.map((n) => n.id)).toEqual(['f1', 'a', 'f2', 'b', 'c', 'f3']);
  });

  it('preserves consecutive interleaved subfolders', () => {
    const children = [card('b', 'Beta'), folder('f1'), folder('f2'), card('a', 'Alpha')];
    const moves = planBookmarkSortMoves(children);
    expect(moves.every((m) => !m.id.startsWith('f'))).toBe(true);

    const result = applyChromeMoves(children, moves);
    expect(result.map((n) => n.id)).toEqual(['a', 'f1', 'f2', 'b']);
  });

  it('preserves trailing subfolder when bookmark crosses an earlier subfolder', () => {
    const children = [card('b', 'Beta'), folder('f1'), card('a', 'Alpha'), folder('f2')];
    const moves = planBookmarkSortMoves(children);
    expect(moves.every((m) => !m.id.startsWith('f'))).toBe(true);

    const result = applyChromeMoves(children, moves);
    expect(result.map((n) => n.id)).toEqual(['a', 'f1', 'b', 'f2']);
  });

  it('breaks title ties by url and ignores case', () => {
    const children = [
      card('2', 'docs', 'https://z.example'),
      card('1', 'Docs', 'https://a.example')
    ];
    const moves = planBookmarkSortMoves(children);
    const result = applyChromeMoves(children, moves);
    expect(result.map((n) => n.id)).toEqual(['1', '2']);
  });
});

describe('sortFolderBookmarks (Chrome API integration)', () => {
  beforeEach(() => {
    chrome.runtime.lastError = null;
  });

  it('executes planned moves via chrome.bookmarks.move and keeps subfolders in place', async () => {
    let liveChildren = [
      folder('f1', 'Subfolder A'),
      card('c', 'Zeta'),
      folder('f2', 'Subfolder B'),
      card('a', 'Alpha')
    ];

    chrome.bookmarks.getChildren._impl = (_parentId, cb) => {
      cb(liveChildren.map((node, index) => ({ ...node, parentId: 'p1', index })));
    };

    const moveCalls = [];
    chrome.bookmarks.move._impl = (id, dest, cb) => {
      moveCalls.push({ id, ...dest });
      liveChildren = applyChromeMoves(liveChildren, [{ id, index: dest.index }]);
      cb({ id, ...dest });
    };

    const moveCount = await sortFolderBookmarks('p1');

    expect(moveCount).toBe(moveCalls.length);
    expect(moveCount).toBeGreaterThan(0);
    expect(moveCalls.every((m) => m.parentId === 'p1' && !m.id.startsWith('f'))).toBe(true);
    expect(liveChildren.map((n) => n.id)).toEqual(['f1', 'a', 'f2', 'c']);
  });
});
