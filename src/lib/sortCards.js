/**
 * Card sort modes for V2-A. Sorting is a purely derived view over the cards
 * `bookmarkService` already returns — it never writes anything back to
 * Chrome. `manual` is the only mode where card drag-and-drop is allowed
 * (main.jsx gates the SortableJS instances on it), so it must reproduce
 * Chrome's own order rather than merely "leave the array alone" — sorting by
 * `index` is what actually guarantees that regardless of how the array
 * arrived here.
 */
export const SORT_MODES = ['manual', 'recent', 'title', 'domain'];
export const DEFAULT_SORT_MODE = 'manual';

// Persisted exactly like `VIEW_STORAGE_KEY` in main.jsx (same storageGet/
// storageSet pair, its own key). Exported so the persistence contract is
// testable without importing main.jsx, which renders to the DOM as a
// module-level side effect.
export const SORT_STORAGE_KEY = 'tabhub_sort_mode';

export function isSortMode(value) {
  return SORT_MODES.includes(value);
}

function cardDomain(card) {
  try {
    return new URL(card.url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function compareTitle(a, b) {
  return String(a.title || '').localeCompare(String(b.title || ''), 'zh');
}

// Array.prototype.sort has been a stable sort in every JS engine this project
// targets (spec-guaranteed since ES2019), so a comparator that returns 0 for
// equal keys is sufficient for "stable on ties" — no secondary index tie-break
// is needed to preserve the incoming order.
const COMPARATORS = {
  manual: (a, b) => (a.index ?? 0) - (b.index ?? 0),
  recent: (a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0),
  title: compareTitle,
  domain: (a, b) => {
    const byDomain = cardDomain(a).localeCompare(cardDomain(b), 'zh');
    return byDomain !== 0 ? byDomain : compareTitle(a, b);
  }
};

export function compareCards(a, b, mode) {
  const comparator = COMPARATORS[mode] || COMPARATORS[DEFAULT_SORT_MODE];
  return comparator(a, b);
}

export function sortCards(cards, mode) {
  const comparator = COMPARATORS[mode] || COMPARATORS[DEFAULT_SORT_MODE];
  return [...cards].sort(comparator);
}

// Pulled out of main.jsx so the "card drag is only allowed in manual order"
// rule (V2-A) is a plain, unit-testable function rather than an inline
// boolean buried in a useEffect's dependency list. main.jsx feeds this
// straight into whether it even constructs the card Sortable instances —
// `sortMode !== 'manual'` disables drag-and-drop, it does not merely hide it.
export function isCardDragEnabled({ searchIsEmpty, manageMode, sortMode }) {
  return !!searchIsEmpty && !manageMode && sortMode === DEFAULT_SORT_MODE;
}
