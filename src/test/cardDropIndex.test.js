import { describe, it, expect } from 'vitest';
import { computeCardMoveIndex } from '@/lib/bookmarkService';

// Minimal chrome.bookmarks.move model: the index is interpreted against the
// child list BEFORE removal, so moving down within a parent lands one earlier.
function makeTree(folders) {
  return Object.fromEntries(Object.entries(folders).map(([id, ids]) => [id, [...ids]]));
}

function childrenOf(tree, parentId) {
  return tree[parentId].map((id, index) => ({
    id,
    index,
    parentId,
    ...(id.startsWith('f') ? {} : { url: `https://${id}.example` })
  }));
}

function chromeMove(tree, id, parentId, index) {
  const oldParent = Object.keys(tree).find((p) => tree[p].includes(id));
  const oldIdx = tree[oldParent].indexOf(id);
  const target = index ?? tree[parentId].length;
  tree[oldParent].splice(oldIdx, 1);
  const adjusted = oldParent === parentId && target > oldIdx ? target - 1 : target;
  tree[parentId].splice(adjusted, 0, id);
}

function dropAt(tree, id, parentId, cardPosition) {
  const index = computeCardMoveIndex(childrenOf(tree, parentId), id, cardPosition);
  chromeMove(tree, id, parentId, index);
}

describe('computeCardMoveIndex + chrome move semantics', () => {
  it('moves A to the end of [A,B,C]', () => {
    const tree = makeTree({ p: ['A', 'B', 'C'] });
    dropAt(tree, 'A', 'p', 2);
    expect(tree.p).toEqual(['B', 'C', 'A']);
  });

  it('moves A down one', () => {
    const tree = makeTree({ p: ['A', 'B', 'C'] });
    dropAt(tree, 'A', 'p', 1);
    expect(tree.p).toEqual(['B', 'A', 'C']);
  });

  it('moves C up to the front', () => {
    const tree = makeTree({ p: ['A', 'B', 'C'] });
    dropAt(tree, 'C', 'p', 0);
    expect(tree.p).toEqual(['C', 'A', 'B']);
  });

  it('moves C up one', () => {
    const tree = makeTree({ p: ['A', 'B', 'C'] });
    dropAt(tree, 'C', 'p', 1);
    expect(tree.p).toEqual(['A', 'C', 'B']);
  });

  it('moves across collections into the middle', () => {
    const tree = makeTree({ p: ['A', 'B'], q: ['X', 'Y'] });
    dropAt(tree, 'A', 'q', 1);
    expect(tree).toEqual({ p: ['B'], q: ['X', 'A', 'Y'] });
  });

  it('appends across collections on a past-the-end or null position', () => {
    const tree = makeTree({ p: ['A'], q: ['X', 'Y'] });
    dropAt(tree, 'A', 'q', 2);
    expect(tree.q).toEqual(['X', 'Y', 'A']);
    dropAt(tree, 'X', 'p', null);
    expect(tree.p).toEqual(['X']);
  });

  it('accounts for a subfolder interleaved among the cards', () => {
    // card positions: A=0, B=1, C=2; chrome indexes: A=0, f1=1, B=2, C=3
    const tree = makeTree({ p: ['A', 'f1', 'B', 'C'] });
    dropAt(tree, 'A', 'p', 1);
    expect(tree.p).toEqual(['f1', 'B', 'A', 'C']);

    const tree2 = makeTree({ p: ['A', 'f1', 'B', 'C'] });
    dropAt(tree2, 'A', 'p', 2);
    expect(tree2.p).toEqual(['f1', 'B', 'C', 'A']);

    const tree3 = makeTree({ p: ['A', 'f1', 'B', 'C'] });
    dropAt(tree3, 'C', 'p', 1);
    expect(tree3.p).toEqual(['A', 'f1', 'C', 'B']);
  });
});
