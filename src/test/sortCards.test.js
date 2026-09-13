import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sortCards,
  compareCards,
  isCardDragEnabled,
  SORT_MODES,
  SORT_STORAGE_KEY,
  DEFAULT_SORT_MODE,
  isSortMode
} from '../lib/sortCards';
import { storageGet, storageSet } from '../lib/storage';

/* V2-A — the sort comparator. Pure and unit-testable on purpose: this is the
   one new function the design round adds, and it must never write back to
   Chrome, so it is exercised here as plain array-in/array-out. */

const card = (overrides) => ({
  id: overrides.id,
  title: overrides.title ?? '',
  url: overrides.url ?? 'https://example.com/',
  parentId: 'p1',
  index: overrides.index ?? 0,
  dateAdded: overrides.dateAdded ?? 0,
  ...overrides
});

describe('sortCards — constants', () => {
  it('exposes the four modes in the spec order, manual first', () => {
    expect(SORT_MODES).toEqual(['manual', 'recent', 'title', 'domain']);
  });

  it('defaults to manual', () => {
    expect(DEFAULT_SORT_MODE).toBe('manual');
  });

  it('isSortMode accepts only the four known keys', () => {
    for (const mode of SORT_MODES) {
      expect(isSortMode(mode)).toBe(true);
    }
    expect(isSortMode('bogus')).toBe(false);
    expect(isSortMode(undefined)).toBe(false);
  });
});

describe('sortCards — manual', () => {
  it('orders by the underlying chrome index, not array position', () => {
    const cards = [card({ id: 'c', index: 2 }), card({ id: 'a', index: 0 }), card({ id: 'b', index: 1 })];

    expect(sortCards(cards, 'manual').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('is stable for equal indexes', () => {
    const cards = [card({ id: 'a', index: 0 }), card({ id: 'b', index: 0 }), card({ id: 'c', index: 0 })];

    expect(sortCards(cards, 'manual').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const cards = [card({ id: 'b', index: 1 }), card({ id: 'a', index: 0 })];
    const original = [...cards];

    sortCards(cards, 'manual');
    expect(cards).toEqual(original);
  });
});

describe('sortCards — recent', () => {
  it('orders newest dateAdded first', () => {
    const cards = [
      card({ id: 'old', dateAdded: 100 }),
      card({ id: 'new', dateAdded: 300 }),
      card({ id: 'mid', dateAdded: 200 })
    ];

    expect(sortCards(cards, 'recent').map((c) => c.id)).toEqual(['new', 'mid', 'old']);
  });

  it('is stable for equal dateAdded (ties keep incoming order)', () => {
    const cards = [card({ id: 'a', dateAdded: 100 }), card({ id: 'b', dateAdded: 100 }), card({ id: 'c', dateAdded: 100 })];

    expect(sortCards(cards, 'recent').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('treats a missing dateAdded as 0 rather than throwing', () => {
    const cards = [card({ id: 'known', dateAdded: 50 }), card({ id: 'unknown', dateAdded: undefined })];

    expect(sortCards(cards, 'recent').map((c) => c.id)).toEqual(['known', 'unknown']);
  });
});

describe('sortCards — title', () => {
  it('orders titles with localeCompare', () => {
    const cards = [card({ id: 'c', title: 'Charlie' }), card({ id: 'a', title: 'Alpha' }), card({ id: 'b', title: 'Bravo' })];

    expect(sortCards(cards, 'title').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('collates Chinese titles via the zh locale rather than code-point order', () => {
    // By code point 云 (U+4E91) < 木 (U+6728), but pinyin "mù" < "yún" — the
    // zh locale, not a raw code-point compare, must decide this and flip it.
    const cards = [card({ id: 'mu', title: '木头' }), card({ id: 'yun', title: '云朵' })];

    expect(sortCards(cards, 'title').map((c) => c.id)).toEqual(['mu', 'yun']);
  });

  it('is stable for equal titles', () => {
    const cards = [card({ id: 'a', title: 'Same' }), card({ id: 'b', title: 'Same' }), card({ id: 'c', title: 'Same' })];

    expect(sortCards(cards, 'title').map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('sortCards — domain', () => {
  it('orders by hostname first', () => {
    const cards = [
      card({ id: 'z', url: 'https://zeta.example/', title: 'Z' }),
      card({ id: 'a', url: 'https://alpha.example/', title: 'A' })
    ];

    expect(sortCards(cards, 'domain').map((c) => c.id)).toEqual(['a', 'z']);
  });

  it('strips a leading www. so it groups with the bare domain', () => {
    const cards = [
      card({ id: 'bare', url: 'https://alpha.example/', title: 'B' }),
      card({ id: 'www', url: 'https://www.alpha.example/', title: 'A' })
    ];

    // Same effective domain: falls through to the title tie-break.
    expect(sortCards(cards, 'domain').map((c) => c.id)).toEqual(['www', 'bare']);
  });

  it('falls back to title within the same domain', () => {
    const cards = [
      card({ id: 'b', url: 'https://example.com/b', title: 'Bravo' }),
      card({ id: 'a', url: 'https://example.com/a', title: 'Alpha' })
    ];

    expect(sortCards(cards, 'domain').map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('treats an unparsable URL as an empty domain rather than throwing', () => {
    const cards = [card({ id: 'good', url: 'https://example.com/', title: 'Z' }), card({ id: 'bad', url: 'not-a-url', title: 'A' })];

    expect(() => sortCards(cards, 'domain')).not.toThrow();
    // Empty domain collates before a real one.
    expect(sortCards(cards, 'domain').map((c) => c.id)).toEqual(['bad', 'good']);
  });

  it('is stable for equal domain and title', () => {
    const cards = [
      card({ id: 'a', url: 'https://example.com/a', title: 'Same' }),
      card({ id: 'b', url: 'https://example.com/b', title: 'Same' })
    ];

    expect(sortCards(cards, 'domain').map((c) => c.id)).toEqual(['a', 'b']);
  });
});

describe('compareCards', () => {
  it('falls back to manual for an unknown mode', () => {
    const a = card({ id: 'a', index: 0 });
    const b = card({ id: 'b', index: 1 });

    expect(compareCards(a, b, 'bogus')).toBe(compareCards(a, b, 'manual'));
  });
});

describe('isCardDragEnabled', () => {
  it('is enabled only in manual order, empty search, out of manage mode', () => {
    expect(isCardDragEnabled({ searchIsEmpty: true, manageMode: false, sortMode: 'manual' })).toBe(true);
  });

  it('is disabled by any non-manual sort mode (V2-A: the whole point of the gate)', () => {
    for (const sortMode of ['recent', 'title', 'domain']) {
      expect(isCardDragEnabled({ searchIsEmpty: true, manageMode: false, sortMode })).toBe(false);
    }
  });

  it('is disabled while a search is active, independent of sort mode', () => {
    expect(isCardDragEnabled({ searchIsEmpty: false, manageMode: false, sortMode: 'manual' })).toBe(false);
  });

  it('is disabled in manage mode, independent of sort mode', () => {
    expect(isCardDragEnabled({ searchIsEmpty: true, manageMode: true, sortMode: 'manual' })).toBe(false);
  });
});

describe('sort mode persistence (tabhub_sort_mode, round-trip through chrome.storage.local)', () => {
  beforeEach(() => {
    let store = {};
    chrome.storage.local.get = vi.fn((keys, cb) => {
      const [key] = keys;
      cb({ [key]: store[key] });
    });
    chrome.storage.local.set = vi.fn((obj, cb) => {
      store = { ...store, ...obj };
      cb();
    });
  });

  it('uses the documented key', () => {
    expect(SORT_STORAGE_KEY).toBe('tabhub_sort_mode');
  });

  it('round-trips a saved mode exactly, and it stays a valid mode', async () => {
    await storageSet(SORT_STORAGE_KEY, 'domain');
    const restored = await storageGet(SORT_STORAGE_KEY);

    expect(restored).toBe('domain');
    expect(isSortMode(restored)).toBe(true);
  });

  it('round-trips every mode', async () => {
    for (const mode of SORT_MODES) {
      await storageSet(SORT_STORAGE_KEY, mode);
      expect(await storageGet(SORT_STORAGE_KEY)).toBe(mode);
    }
  });

  it('a missing/garbage stored value is not treated as a valid mode (the load path falls back to the default)', async () => {
    const nothingStored = await storageGet(SORT_STORAGE_KEY);
    expect(isSortMode(nothingStored)).toBe(false);

    await storageSet(SORT_STORAGE_KEY, 'not-a-real-mode');
    expect(isSortMode(await storageGet(SORT_STORAGE_KEY))).toBe(false);
  });
});
