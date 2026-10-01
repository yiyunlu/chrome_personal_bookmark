/**
 * Command-palette (Cmd/Ctrl+K) search — pure, local, no Chrome calls.
 *
 * Reuses `smartSearch` (fuzzy + category expansion) for ranking so the palette
 * and the toolbar search box never disagree about what "matches" means. This
 * module only shapes the three result groups and the flat, keyboard-navigable
 * order the palette renders them in.
 */
import { smartSearch } from './searchService';

export const PALETTE_GROUP_LIMIT = 8;

export const PALETTE_GROUP_ORDER = ['bookmarks', 'collections', 'tabs'];

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || '';
  }
}

function bookmarkItem(card) {
  return {
    key: `bookmark:${card.id}`,
    type: 'bookmark',
    id: card.id,
    title: card.title || card.url,
    url: card.url,
    subtitle: hostOf(card.url),
    meta: card.collectionTitle || ''
  };
}

function collectionItem(collection) {
  return {
    key: `collection:${collection.id}`,
    type: 'collection',
    id: collection.id,
    title: collection.title,
    url: '',
    subtitle: '',
    count: (collection.cards || []).length
  };
}

function tabItem(tab) {
  return {
    key: `tab:${tab.id}`,
    type: 'tab',
    id: tab.id,
    title: tab.title || tab.url,
    url: tab.url,
    subtitle: hostOf(tab.url),
    meta: ''
  };
}

/**
 * @param {string} query
 * @param {{cards?: Array, collections?: Array, tabs?: Array}} data
 *   cards: flat bookmarks with `collectionTitle` (useCollections' `allCards`)
 *   collections: `{id, title, cards}`; tabs: `getOpenTabs()` rows
 * @param {number} [limit] per-group cap
 * @returns {{bookmarks: object[], collections: object[], tabs: object[]}}
 *
 * An empty query browses instead of searching: collections and open tabs are
 * listed (a jump list), bookmarks are not — dumping every bookmark in an
 * unfiltered box is noise, and typing narrows it immediately.
 */
export function searchPalette(query, { cards = [], collections = [], tabs = [] } = {}, limit = PALETTE_GROUP_LIMIT) {
  const q = (query || '').trim();

  if (!q) {
    return {
      bookmarks: [],
      collections: collections.slice(0, limit).map(collectionItem),
      tabs: tabs.slice(0, limit).map(tabItem)
    };
  }

  const bookmarks = smartSearch(q, cards)
    .slice(0, limit)
    .map((r) => bookmarkItem(r.bookmark));

  // smartSearch reads title/url/collectionTitle; a collection only has a title.
  const collectionHits = smartSearch(
    q,
    collections.map((c) => ({ id: c.id, title: c.title, url: '', collectionTitle: '', source: c }))
  )
    .slice(0, limit)
    .map((r) => collectionItem(r.bookmark.source));

  const tabHits = smartSearch(q, tabs)
    .slice(0, limit)
    .map((r) => tabItem(r.bookmark));

  return { bookmarks, collections: collectionHits, tabs: tabHits };
}

/** Display order of every item, which is also the arrow-key order. */
export function flattenPalette(groups) {
  return PALETTE_GROUP_ORDER.flatMap((name) => groups[name] || []);
}
