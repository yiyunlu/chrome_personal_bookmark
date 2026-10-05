import { describe, it, expect } from 'vitest';
import { flattenPalette, searchPalette, PALETTE_GROUP_LIMIT } from '../lib/paletteSearch';

const cards = [
  { id: 'b1', title: 'React Tutorial', url: 'https://react.dev/learn', collectionId: 'c1', collectionTitle: 'Dev' },
  { id: 'b2', title: 'Recipes', url: 'https://cooking.example.com', collectionId: 'c2', collectionTitle: 'Food' },
  { id: 'b3', title: 'GitHub', url: 'https://github.com', collectionId: 'c1', collectionTitle: 'Dev' }
];
const collections = [
  { id: 'c1', title: 'Dev', cards: [cards[0], cards[2]] },
  { id: 'c2', title: 'Food', cards: [cards[1]] }
];
const tabs = [
  { id: 11, title: 'React docs', url: 'https://react.dev/reference' },
  { id: 12, title: 'Inbox', url: 'https://mail.example.com' }
];
const data = { cards, collections, tabs };

describe('searchPalette', () => {
  it('returns bookmarks, collections and open tabs in their own groups', () => {
    const r = searchPalette('react', data);
    expect(r.bookmarks.map((i) => i.id)).toEqual(['b1']);
    expect(r.tabs.map((i) => i.id)).toEqual([11]);
    expect(r.collections).toEqual([]);

    const d = searchPalette('dev', data);
    expect(d.collections.map((i) => i.id)).toEqual(['c1']);
    expect(d.collections[0]).toMatchObject({ type: 'collection', title: 'Dev', count: 2 });
  });

  it('shapes items with type, key, host subtitle and owning collection', () => {
    const [item] = searchPalette('github', data).bookmarks;
    expect(item).toMatchObject({
      key: 'bookmark:b3',
      type: 'bookmark',
      url: 'https://github.com',
      subtitle: 'github.com',
      meta: 'Dev'
    });
    const [tab] = searchPalette('inbox', data).tabs;
    expect(tab).toMatchObject({ key: 'tab:12', type: 'tab', subtitle: 'mail.example.com' });
  });

  it('matches case-insensitively and on URL', () => {
    expect(searchPalette('REACT', data).bookmarks).toHaveLength(1);
    expect(searchPalette('cooking', data).bookmarks.map((i) => i.id)).toEqual(['b2']);
  });

  it('empty query browses collections and tabs, not every bookmark', () => {
    const r = searchPalette('   ', data);
    expect(r.bookmarks).toEqual([]);
    expect(r.collections).toHaveLength(2);
    expect(r.tabs).toHaveLength(2);
  });

  it('no match anywhere gives three empty groups', () => {
    const r = searchPalette('zzzqqq', data);
    expect(flattenPalette(r)).toEqual([]);
  });

  it('caps each group', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, title: `note ${i}`, url: `https://n${i}.com` }));
    const r = searchPalette('note', { cards: many });
    expect(r.bookmarks).toHaveLength(PALETTE_GROUP_LIMIT);
    expect(searchPalette('note', { cards: many }, 3).bookmarks).toHaveLength(3);
  });

  it('tolerates missing inputs', () => {
    expect(searchPalette('x')).toEqual({ bookmarks: [], collections: [], tabs: [] });
    expect(searchPalette(undefined, {})).toEqual({ bookmarks: [], collections: [], tabs: [] });
  });
});

describe('flattenPalette', () => {
  it('orders bookmarks, then collections, then tabs (the arrow-key order)', () => {
    const flat = flattenPalette({
      tabs: [{ key: 't' }],
      bookmarks: [{ key: 'b' }],
      collections: [{ key: 'c' }]
    });
    expect(flat.map((i) => i.key)).toEqual(['b', 'c', 't']);
  });
});
