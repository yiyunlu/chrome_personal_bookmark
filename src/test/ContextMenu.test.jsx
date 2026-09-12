import React, { useCallback, useState } from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextMenu } from '../components/ContextMenu';
import { CollectionCard } from '../components/CollectionCard';
import { t } from '../lib/i18n';

// Radix's Popper measures its anchor with ResizeObserver, which jsdom does not
// implement. Polyfilled here rather than in setup.js so this file stays
// independent of the other phases' test setup.
beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

const collection = {
  id: 'col-1',
  parentId: 'src-1',
  title: 'Reading',
  folderTitle: 'Reading',
  editable: true,
  deletable: true,
  cards: [{ id: 'card-1', title: 'Radix Docs', url: 'https://radix-ui.com/', parentId: 'col-1', index: 0 }]
};

/**
 * Mirrors main.jsx's wiring exactly: App owns a `contextMenu` state object
 * ({ kind, x, y, card|collection }) that the card / header right-click handlers
 * populate, and renders one <ContextMenu> from it.
 */
function Harness({ handlers = {} }) {
  const [contextMenu, setContextMenu] = useState(null);

  const openCardContextMenu = useCallback((event, card) => {
    event.preventDefault();
    setContextMenu({ kind: 'card', x: event.clientX, y: event.clientY, card });
  }, []);

  const openCollectionContextMenu = useCallback((event, col) => {
    if (!col.editable && !col.deletable) return;
    event.preventDefault();
    setContextMenu({ kind: 'collection', x: event.clientX, y: event.clientY, collection: col });
  }, []);

  return (
    <div>
      <section data-module-sortable="true">
        <CollectionCard
          collection={collection}
          collapsed={false}
          moduleDraggable
          cardDragEnabled
          manageMode={false}
          selectedCardIds={new Set()}
          onToggleCollapse={() => {}}
          onCardClick={() => {}}
          onCardContextMenu={openCardContextMenu}
          onCollectionContextMenu={openCollectionContextMenu}
          onEditCard={() => {}}
          onDeleteCard={() => {}}
          onToggleCardSelect={() => {}}
          onOpenAll={() => {}}
          onTagClick={() => {}}
        />
      </section>
      <ContextMenu
        contextMenu={contextMenu}
        onOpenNewTab={handlers.onOpenNewTab}
        onEditCard={handlers.onEditCard}
        onDeleteCard={handlers.onDeleteCard}
        onRenameCollection={handlers.onRenameCollection}
        onDeleteCollection={handlers.onDeleteCollection}
        onClose={() => {
          setContextMenu(null);
          handlers.onClose?.();
        }}
      />
    </div>
  );
}

const makeHandlers = () => ({
  onOpenNewTab: vi.fn(),
  onEditCard: vi.fn(),
  onDeleteCard: vi.fn(),
  onRenameCollection: vi.fn(),
  onDeleteCollection: vi.fn(),
  onClose: vi.fn()
});

const cardEl = () => document.querySelector('[data-card-id="card-1"]');
const headerEl = () => document.querySelector('[data-collection-id="col-1"] button');

describe('ContextMenu (Radix DropdownMenu)', () => {
  it('renders no menu while contextMenu is null', () => {
    render(<ContextMenu contextMenu={null} {...makeHandlers()} />);
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(screen.queryByText(t('openInNewTab'))).toBeNull();
  });

  it('opens on a contextmenu event over a bookmark card', async () => {
    render(<Harness handlers={makeHandlers()} />);
    expect(document.querySelector('[role="menu"]')).toBeNull();

    fireEvent.contextMenu(cardEl(), { clientX: 120, clientY: 240 });

    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());
    expect(screen.getByText(t('openInNewTab'))).toBeInTheDocument();
    expect(screen.getByText(t('editBookmark'))).toBeInTheDocument();
    expect(screen.getByText(t('deleteToTrash'))).toBeInTheDocument();
  });

  it('opens on a contextmenu event over a collection header', async () => {
    render(<Harness handlers={makeHandlers()} />);

    fireEvent.contextMenu(headerEl(), { clientX: 30, clientY: 40 });

    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());
    expect(screen.getByText(t('renameFolder')).closest('[role="menuitem"]')).toBeInTheDocument();
    expect(screen.getByText(t('deleteFolder')).closest('[role="menuitem"]')).toBeInTheDocument();
    // Card-only entries must not leak into the collection menu.
    expect(screen.queryByText(t('openInNewTab'))).toBeNull();
  });

  it('anchors the menu at the pointer coordinates', async () => {
    render(<Harness handlers={makeHandlers()} />);
    fireEvent.contextMenu(cardEl(), { clientX: 137, clientY: 251 });

    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());
    const anchor = document.querySelector('[data-context-menu-anchor]');
    expect(anchor).not.toBeNull();
    expect(anchor.style.left).toBe('137px');
    expect(anchor.style.top).toBe('251px');
  });

  it.each([
    ['openInNewTab', 'onOpenNewTab'],
    ['editBookmark', 'onEditCard'],
    ['deleteToTrash', 'onDeleteCard']
  ])('card item %s invokes %s', async (labelKey, handlerKey) => {
    const handlers = makeHandlers();
    render(<Harness handlers={handlers} />);
    fireEvent.contextMenu(cardEl(), { clientX: 10, clientY: 10 });
    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());

    fireEvent.click(screen.getByText(t(labelKey)).closest('[role="menuitem"]'));

    expect(handlers[handlerKey]).toHaveBeenCalledTimes(1);
    for (const [key, fn] of Object.entries(handlers)) {
      if (key !== handlerKey && key !== 'onClose') expect(fn).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['renameFolder', 'onRenameCollection'],
    ['deleteFolder', 'onDeleteCollection']
  ])('collection item %s invokes %s', async (labelKey, handlerKey) => {
    const handlers = makeHandlers();
    render(<Harness handlers={handlers} />);
    fireEvent.contextMenu(headerEl(), { clientX: 10, clientY: 10 });
    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());

    fireEvent.click(screen.getByText(t(labelKey)).closest('[role="menuitem"]'));

    expect(handlers[handlerKey]).toHaveBeenCalledTimes(1);
    for (const [key, fn] of Object.entries(handlers)) {
      if (key !== handlerKey && key !== 'onClose') expect(fn).not.toHaveBeenCalled();
    }
  });

  it('selecting an item closes the menu', async () => {
    const handlers = makeHandlers();
    render(<Harness handlers={handlers} />);
    fireEvent.contextMenu(cardEl(), { clientX: 10, clientY: 10 });
    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());

    fireEvent.click(screen.getByText(t('editBookmark')).closest('[role="menuitem"]'));

    await waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('Escape closes the menu (Radix owns the key handling now)', async () => {
    const handlers = makeHandlers();
    render(<Harness handlers={handlers} />);
    fireEvent.contextMenu(cardEl(), { clientX: 10, clientY: 10 });
    const menu = await waitFor(() => {
      const el = document.querySelector('[role="menu"]');
      expect(el).not.toBeNull();
      return el;
    });

    fireEvent.keyDown(menu, { key: 'Escape' });

    await waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('exposes Radix roving focus: items are menuitems and focus starts inside', async () => {
    render(<Harness handlers={makeHandlers()} />);
    fireEvent.contextMenu(cardEl(), { clientX: 10, clientY: 10 });
    const menu = await waitFor(() => {
      const el = document.querySelector('[role="menu"]');
      expect(el).not.toBeNull();
      return el;
    });

    expect(menu.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
    expect(menu).toHaveAttribute('aria-label', t('bookmarkActions'));
    // Radix focuses the content itself and then delegates arrow keys to its
    // RovingFocusGroup; either the content or an item must hold focus.
    expect(menu.contains(document.activeElement) || menu === document.activeElement).toBe(true);
  });

  it('ArrowDown / ArrowUp / End cycle focus without any hand-rolled handler', async () => {
    render(<Harness handlers={makeHandlers()} />);
    fireEvent.contextMenu(cardEl(), { clientX: 10, clientY: 10 });
    const menu = await waitFor(() => {
      const el = document.querySelector('[role="menu"]');
      expect(el).not.toBeNull();
      return el;
    });
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));

    // Radix's RovingFocusGroup moves focus in a microtask, so each step waits.
    const pressAndExpect = async (key, expected) => {
      fireEvent.keyDown(document.activeElement, { key });
      await waitFor(() => expect(document.activeElement).toBe(expected));
    };

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);

    await pressAndExpect('ArrowDown', items[1]);
    await pressAndExpect('ArrowUp', items[0]);
    // Home / End are Radix extras the hand-rolled menu never supported.
    await pressAndExpect('End', items[items.length - 1]);
    await pressAndExpect('Home', items[0]);
  });

  it('opening and closing the menu never marks a card as dragging', async () => {
    render(<Harness handlers={makeHandlers()} />);
    const card = cardEl();

    // A right-press must not be treated as a drag start.
    fireEvent.pointerDown(card, { button: 2, buttons: 2 });
    fireEvent.mouseDown(card, { button: 2, buttons: 2 });
    fireEvent.contextMenu(card, { clientX: 10, clientY: 10 });
    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());
    expect(document.querySelector('.card-dragging')).toBeNull();

    fireEvent.keyDown(document.querySelector('[role="menu"]'), { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());

    expect(document.querySelector('.card-dragging')).toBeNull();
    // …and the SortableJS host is still the same node, untouched.
    expect(cardEl()).toBe(card);
    expect(card.getAttribute('data-card-id')).toBe('card-1');
  });

  it('keeps the SortableJS DOM invariants: data-* attributes stay on their hosts', async () => {
    render(<Harness handlers={makeHandlers()} />);

    const article = document.querySelector('[data-collection-id="col-1"]');
    expect(article.tagName).toBe('ARTICLE');
    expect(article.getAttribute('data-draggable')).toBe('true');
    expect(article.parentElement.getAttribute('data-module-sortable')).toBe('true');

    const card = cardEl();
    expect(card.parentElement.getAttribute('data-cards-collection-id')).toBe('col-1');
    expect(card.parentElement.getAttribute('data-parent-id')).toBe('col-1');

    // Opening the menu must not insert a wrapper around either host.
    fireEvent.contextMenu(card, { clientX: 10, clientY: 10 });
    await waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull());

    expect(cardEl().parentElement.getAttribute('data-cards-collection-id')).toBe('col-1');
    expect(document.querySelector('[data-collection-id="col-1"]').parentElement.getAttribute('data-module-sortable')).toBe('true');
  });
});
