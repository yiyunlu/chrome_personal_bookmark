import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CollectionCard, BookmarkCard } from '../components/CollectionCard';
import { generateTags } from '../lib/enrichmentService';
import { t } from '../lib/i18n';

/**
 * P5a — the SortableJS DOM contract of CollectionCard.
 *
 * `main.jsx` drives three Sortable scopes against this component and, after a
 * card drop, reverts Sortable's DOM mutation before React reconciles
 * (`evt.from.children[oldIndex]`). That arithmetic is only correct while the
 * drag hosts keep their element, their depth and their child order.
 *
 * BASELINE below was captured by rendering the pre-P5a component (commit
 * c74233a) into the same harness and dumping the rendered DOM; every number
 * here is that measurement, not a guess. The migration is allowed to restyle
 * these nodes; it is not allowed to move them.
 *
 * Falsifiability: each expectation was mutation-checked by breaking the
 * component (wrapping a host in a <div>, moving an attribute to a child,
 * splitting the cards container) and confirming this file goes red.
 */
const BASELINE = {
  // depth in element hops from the [data-module-sortable] container
  moduleHost: { tag: 'ARTICLE', depth: 1, indexInParent: 0 },
  collectionDragHandle: { tag: 'SPAN', depth: 3, indexInParent: 0 },
  cardsContainer: { tag: 'DIV', depth: 3, indexInParent: 0 },
  firstCard: { tag: 'DIV', depth: 4, indexInParent: 0 },
  cardDragHandle: { tag: 'SPAN', depth: 5, indexInParent: 0 }
};

const mkCard = (i) => ({
  id: `card-${i}`,
  title: `Card ${i}`,
  url: `https://github.com/owner/repo-${i}`,
  parentId: 'col-1',
  index: i
});

const collection = {
  id: 'col-1',
  parentId: 'src-1',
  title: 'Reading',
  editable: true,
  cards: [mkCard(0), mkCard(1), mkCard(2)]
};

const baseProps = {
  collection,
  collapsed: false,
  moduleDraggable: true,
  cardDragEnabled: true,
  manageMode: false,
  selectedCardIds: new Set(),
  onToggleCollapse: () => {},
  onCardClick: () => {},
  onCardContextMenu: () => {},
  onCollectionContextMenu: () => {},
  onEditCard: () => {},
  onDeleteCard: () => {},
  onToggleCardSelect: () => {},
  onOpenAll: () => {},
  onTagClick: () => {}
};

/**
 * Renders into a stand-in for main.jsx's `<section data-module-sortable>`.
 * The host is the harness's, so nothing here asserts that attribute — only
 * positions *relative* to it, which the component alone decides.
 */
function mount(props = {}) {
  const host = document.createElement('section');
  document.body.appendChild(host);
  const utils = render(<CollectionCard {...baseProps} {...props} />, { container: host });
  return { host, ...utils };
}

const depthFrom = (root, el) => {
  let d = 0;
  let n = el;
  while (n && n !== root) {
    n = n.parentElement;
    d += 1;
  }
  if (!n) throw new Error('element is not inside the given root');
  return d;
};

const indexInParent = (el) => Array.from(el.parentElement.children).indexOf(el);

/** The five load-bearing nodes, described the way main.jsx reaches them. */
function dragSkeleton(host) {
  const article = host.querySelector('[data-collection-id]');
  const cardsContainer = host.querySelector('[data-cards-collection-id]');
  const firstCard = host.querySelector('[data-card-id]');
  const collectionHandle = host.querySelector('.collection-drag-handle');
  const cardHandle = host.querySelector('.card-drag-handle');
  const describe_ = (el) =>
    el && { tag: el.tagName, depth: depthFrom(host, el), indexInParent: indexInParent(el) };
  return {
    moduleHost: describe_(article),
    collectionDragHandle: describe_(collectionHandle),
    cardsContainer: describe_(cardsContainer),
    firstCard: describe_(firstCard),
    cardDragHandle: describe_(cardHandle)
  };
}

describe('CollectionCard — SortableJS drag hosts', () => {
  it('places all five drag-host nodes exactly where the pre-P5a DOM placed them', () => {
    const { host } = mount();
    expect(dragSkeleton(host)).toEqual(BASELINE);
  });

  it('keeps data-collection-id and data-draggable on one element that is a direct child of the Sortable container', () => {
    const { host } = mount();
    const article = host.querySelector('[data-collection-id]');

    // Sortable only sorts DIRECT children of its container, and main.jsx maps
    // container.querySelectorAll('[data-draggable="true"]') onto collection ids,
    // so both attributes must ride the same direct child.
    expect(article.parentElement).toBe(host);
    expect(article.tagName).toBe('ARTICLE');
    expect(article.getAttribute('data-collection-id')).toBe('col-1');
    expect(article.getAttribute('data-draggable')).toBe('true');
    expect(host.querySelectorAll('[data-draggable]')).toHaveLength(1);
    expect(host.querySelector('[data-draggable]')).toBe(article);
  });

  it('reports data-draggable="false" when the collection is not module-draggable', () => {
    const { host } = mount({ moduleDraggable: false });
    const article = host.querySelector('[data-collection-id]');
    expect(article.getAttribute('data-draggable')).toBe('false');
    // The handle stays in the DOM (Sortable's `handle:` selector) but is hidden.
    expect(host.querySelector('.collection-drag-handle').className).toContain('invisible');
  });

  it('keeps data-cards-collection-id and data-parent-id on the same element', () => {
    const { host } = mount();
    // main.jsx reads data-parent-id off evt.from/evt.to and
    // data-cards-collection-id off evt.to — the same node in both cases.
    const byCards = host.querySelector('[data-cards-collection-id="col-1"]');
    const byParent = host.querySelector('[data-parent-id="col-1"]');
    expect(byCards).toBe(byParent);
    expect(host.querySelectorAll('[data-cards-collection-id]')).toHaveLength(1);
  });

  it('makes every child of the cards container a card, in collection order', () => {
    const { host } = mount();
    const container = host.querySelector('[data-cards-collection-id]');

    // evt.from.children[oldIndex] indexes this list directly: any non-card child
    // (a heading, a wrapper, a Separator) would shift the revert by one.
    const ids = Array.from(container.children).map((el) => el.getAttribute('data-card-id'));
    expect(ids).toEqual(['card-0', 'card-1', 'card-2']);
    expect(container.children).toHaveLength(collection.cards.length);
    for (const child of container.children) {
      expect(child.tagName).toBe('DIV');
      // handle: '.card-drag-handle' must resolve inside the dragged item
      expect(child.querySelectorAll('.card-drag-handle')).toHaveLength(1);
    }
  });

  it('puts the empty-state drop zone on the cards container itself', () => {
    const { host } = mount({ collection: { ...collection, cards: [] } });
    const container = host.querySelector('[data-cards-collection-id="col-1"]');
    expect(container).not.toBeNull();
    expect(container.getAttribute('data-parent-id')).toBe('col-1');
    expect(container.children).toHaveLength(0); // text only — a card can drop in
    expect(container.textContent).toBe(t('dragHere'));
    expect(depthFrom(host, container)).toBe(BASELINE.cardsContainer.depth);
  });

  it('renders no cards container at all while collapsed', () => {
    const { host } = mount({ collapsed: true });
    expect(host.querySelector('[data-cards-collection-id]')).toBeNull();
    expect(host.querySelector('[data-card-id]')).toBeNull();
    // main.jsx skips collapsed collections when creating card Sortables.
    expect(host.querySelector('[data-collection-id]')).not.toBeNull();
  });

  it('holds the host structure across a re-render, without remounting the nodes', () => {
    const { host, rerender } = mount();
    const before = dragSkeleton(host);
    const articleNode = host.querySelector('[data-collection-id]');
    const containerNode = host.querySelector('[data-cards-collection-id]');
    const cardNodes = Array.from(containerNode.children);

    rerender(
      <CollectionCard
        {...baseProps}
        collection={{ ...collection, title: 'Renamed' }}
        manageMode
        selectedCardIds={new Set(['card-1'])}
      />
    );

    expect(screen.getByText('Renamed')).toBeInTheDocument();
    expect(dragSkeleton(host)).toEqual(before);
    expect(dragSkeleton(host)).toEqual(BASELINE);

    // Node identity: a remount would hand main.jsx's onEnd revert a stale node.
    expect(host.querySelector('[data-collection-id]')).toBe(articleNode);
    expect(host.querySelector('[data-cards-collection-id]')).toBe(containerNode);
    expect(Array.from(containerNode.children)).toEqual(cardNodes);
  });

  it('keeps the class hooks main.jsx reads on click (.card-drag-handle, .card-mini-btn, .card-select)', () => {
    const { host } = mount({ manageMode: true });
    // handleCardClick (main.jsx:1230) bails when the click target is inside one
    // of these three, so they cannot be renamed by a restyle.
    const card = host.querySelector('[data-card-id="card-0"]');
    expect(card.querySelectorAll('.card-drag-handle')).toHaveLength(1);
    expect(card.querySelectorAll('.card-select')).toHaveLength(1);
    expect(card.querySelectorAll('.card-mini-btn')).toHaveLength(2);
    expect(card.querySelector('.card-select').getAttribute('type')).toBe('checkbox');
  });

  it('keeps the collection drag handle inside the module drag host', () => {
    const { host } = mount();
    const article = host.querySelector('[data-collection-id]');
    const handle = host.querySelector('.collection-drag-handle');
    // Sortable resolves `handle:` within the dragged item.
    expect(article.contains(handle)).toBe(true);
    expect(depthFrom(host, handle)).toBe(BASELINE.collectionDragHandle.depth);
  });
});

describe('CollectionCard — behaviour preserved by the restyle', () => {
  it('toggles the collection from the header', () => {
    const onToggleCollapse = vi.fn();
    mount({ onToggleCollapse });
    fireEvent.click(screen.getByText('Reading'));
    expect(onToggleCollapse).toHaveBeenCalledWith('col-1');
  });

  it('opens all tabs without toggling the collection', () => {
    const onOpenAll = vi.fn();
    const onToggleCollapse = vi.fn();
    mount({ onOpenAll, onToggleCollapse });
    fireEvent.click(screen.getByRole('button', { name: t('openAllTabs') }));
    expect(onOpenAll).toHaveBeenCalledWith('col-1');
    expect(onToggleCollapse).not.toHaveBeenCalled();
  });

  it('hides the open-all control when the collection is empty', () => {
    mount({ collection: { ...collection, cards: [] } });
    expect(screen.queryByRole('button', { name: t('openAllTabs') })).toBeNull();
  });

  it('raises the collection context menu from anywhere on the header row', () => {
    const onCollectionContextMenu = vi.fn();
    const { host } = mount({ onCollectionContextMenu });
    const header = host.querySelector('.collection-drag-handle').parentElement;

    fireEvent.contextMenu(header);
    expect(onCollectionContextMenu).toHaveBeenCalledTimes(1);
    expect(onCollectionContextMenu.mock.calls[0][1]).toBe(collection);

    // ...including over the title button, which is how ContextMenu.test.jsx
    // (and a real right-click on the header text) reaches it.
    fireEvent.contextMenu(screen.getByText('Reading'));
    expect(onCollectionContextMenu).toHaveBeenCalledTimes(2);
  });

  it('survives a right-click when onCollectionContextMenu is not passed (it is optional)', () => {
    const { host } = mount({ onCollectionContextMenu: undefined });
    const header = host.querySelector('.collection-drag-handle').parentElement;
    expect(() => fireEvent.contextMenu(header)).not.toThrow();
  });

  it('raises the card context menu from the card host', () => {
    const onCardContextMenu = vi.fn();
    const { host } = mount({ onCardContextMenu });
    fireEvent.contextMenu(host.querySelector('[data-card-id="card-1"]'));
    expect(onCardContextMenu).toHaveBeenCalledTimes(1);
    expect(onCardContextMenu.mock.calls[0][1].id).toBe('card-1');
  });

  it('opens a card on click and selects it in manage mode', () => {
    const onCardClick = vi.fn();
    const { host } = mount({ onCardClick });
    fireEvent.click(host.querySelector('[data-card-id="card-2"]'));
    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onCardClick.mock.calls[0][1].id).toBe('card-2');
  });

  it('routes the manage-mode row actions without also opening the card', () => {
    const onEditCard = vi.fn();
    const onDeleteCard = vi.fn();
    const onCardClick = vi.fn();
    const { host } = mount({ manageMode: true, onEditCard, onDeleteCard, onCardClick });
    const card = within(host.querySelector('[data-card-id="card-0"]'));

    fireEvent.click(card.getByRole('button', { name: t('edit') }));
    fireEvent.click(card.getByRole('button', { name: t('delete') }));

    expect(onEditCard).toHaveBeenCalledWith(collection.cards[0]);
    expect(onDeleteCard).toHaveBeenCalledWith(collection.cards[0]);
    // stopPropagation keeps the card's own click handler out of it.
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('toggles selection from the checkbox and reflects isSelected', () => {
    const onToggleCardSelect = vi.fn();
    const { host } = mount({
      manageMode: true,
      selectedCardIds: new Set(['card-1']),
      onToggleCardSelect
    });
    const boxes = host.querySelectorAll('.card-select');
    expect(boxes[0].checked).toBe(false);
    expect(boxes[1].checked).toBe(true);
    fireEvent.click(boxes[0]);
    expect(onToggleCardSelect).toHaveBeenCalledWith('card-0');
  });

  // The design's grid tile is two lines: title, then the URL. Tags used to render
  // here and no longer do — they belong to the list view, which uses the same
  // onTagClick prop. This replaces the old "filters by a tag" test: the behaviour
  // did not regress, it moved, and this pins the grid tile's shape so it cannot
  // silently grow a third line again.
  it('renders exactly two lines and no tag controls in the grid tile', () => {
    const onTagClick = vi.fn();
    const { host } = mount({ onTagClick });
    const expected = generateTags({ url: collection.cards[0].url, title: collection.cards[0].title })[0];
    expect(expected).toBeTruthy(); // the fixture would produce a tag if we rendered them

    const card = host.querySelector('[data-card-id="card-0"]');
    expect(within(card).queryByRole('button', { name: expected })).toBeNull();
    expect(onTagClick).not.toHaveBeenCalled();

    // The text column holds the title and the domain, and nothing else.
    const column = card.querySelector('.min-w-0.flex-1');
    expect(column.children).toHaveLength(2);
    expect(column.children[0]).toHaveTextContent(collection.cards[0].title);
    expect(column.children[1].className).toMatch(/\bfont-mono\b/);
  });

  it('shows the card domain and the card url tooltip', () => {
    const { host } = mount();
    const card = host.querySelector('[data-card-id="card-0"]');
    expect(card.getAttribute('title')).toBe(collection.cards[0].url);
    expect(within(card).getByText('github.com')).toBeInTheDocument();
  });
});

describe('CollectionCard — style contract', () => {
  it('renders no inline var() colour anywhere', () => {
    const { host } = mount({ manageMode: true });
    for (const el of host.querySelectorAll('[style]')) {
      expect(el.getAttribute('style')).not.toContain('var(--');
    }
  });

  it('uses no banned radius', () => {
    const { host } = mount({ manageMode: true });
    const classes = Array.from(host.querySelectorAll('*'))
      .map((el) => (typeof el.className === 'string' ? el.className : ''))
      .join(' ');
    // The banned set is 2xl/3xl. rounded-sm is legal and used deliberately: it is
    // 6px in this scale and what shadcn's own dense elements ship, so the favicon
    // tile uses it.
    expect(classes).not.toMatch(/\brounded-2xl\b/);
    expect(classes).not.toMatch(/\brounded-3xl\b/);
  });

  it('names every icon-only control', () => {
    const { host } = mount({ manageMode: true });
    for (const btn of host.querySelectorAll('button')) {
      const name = btn.getAttribute('aria-label') || btn.textContent.trim();
      expect(name.length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('button', { name: t('openAllTabs') })).toBeInTheDocument();
    expect(host.querySelectorAll(`button[aria-label="${t('edit')}"]`)).toHaveLength(3);
    expect(host.querySelectorAll(`button[aria-label="${t('delete')}"]`)).toHaveLength(3);
  });

  it('keeps both exports memoized so hundreds of cards do not re-render', () => {
    // React.memo wraps the component in an object tagged react.memo; dropping
    // the wrapper makes this fail.
    expect(CollectionCard.$$typeof).toBe(Symbol.for('react.memo'));
    expect(BookmarkCard.$$typeof).toBe(Symbol.for('react.memo'));
  });
});
