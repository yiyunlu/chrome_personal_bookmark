import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Sortable from 'sortablejs';
import { Sidebar } from '../components/Sidebar';
import { SidebarP5Baseline } from './fixtures/SidebarP5Baseline';

/* P5b: `Sidebar` moves onto the style contract — every hand-written colour
   becomes a token class and every raw <button> becomes shadcn's <Button>.
   `<Button>` renders a real <button> with no wrapper when `asChild` is false,
   so in principle nothing about the SortableJS host moves. This file proves it
   instead of assuming it, by rendering the frozen P5-baseline component
   (src/test/fixtures/SidebarP5Baseline.jsx — the file as it stood at c74233a)
   beside the migrated one with identical props and diffing the rendered DOM of
   the `[data-nav-sortable]` scope node by node.

   What `main.jsx` actually depends on, and therefore what is compared:
     main.jsx:344  document.querySelector('[data-nav-sortable="true"]')
     main.jsx:352  new Sortable(container, { draggable: '[data-draggable="true"]',
                                             handle: '.nav-drag-handle' })
     main.jsx:359  container.querySelectorAll('[data-draggable="true"]')
                     .map(el => el.getAttribute('data-collection-id'))
   plus SortableJS's own `evt.from.children[oldIndex]` indexing, which is why
   the *whole* child list of the container is compared, not only the rows that
   carry the attributes. */

const collections = [
  { id: 'c1', title: '工作', parentId: 's1', editable: true, deletable: true, cards: [{ id: 'b1' }, { id: 'b2' }] },
  { id: 'c2', title: '阅读', parentId: 's1', editable: true, deletable: true, cards: [] },
  // Not draggable: a different parent, so `isDraggable` is false and the row
  // must render data-draggable="false" — Sortable's `draggable` selector has to
  // keep excluding it.
  { id: 'c3', title: '归档', parentId: 'other', editable: true, deletable: false, cards: [{ id: 'b3' }] },
  // Not editable: also excluded, and its `title` hint is empty.
  { id: 'c4', title: '只读', parentId: 's1', editable: false, deletable: false, cards: [] }
];

const baseProps = {
  sources: [{ id: 's1', title: 'TabHub', isTabHub: true }],
  activeSourceId: 's1',
  onSourceChange: vi.fn(),
  themeMode: 'system',
  onThemeModeChange: vi.fn(),
  languageSetting: 'auto',
  onLanguageChange: vi.fn(),
  collections,
  activeCollectionId: 'c2',
  onCollectionSelect: vi.fn(),
  canSortCollections: true,
  onCollectionContextMenu: vi.fn(),
  collapsed: false,
  onToggleCollapse: vi.fn(),
  onViewTrash: vi.fn(),
  onOpenSettings: vi.fn(),
  hasTrash: true
};

/** Path of `el` up to `root`, as the chain of child indices. */
function indexPath(el, root) {
  const path = [];
  let node = el;
  while (node && node !== root) {
    path.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
    node = node.parentElement;
  }
  return path;
}

/**
 * Everything SortableJS and `main.jsx` can observe about the nav host.
 * Deliberately excludes className and inline style — those are exactly what
 * this phase changes.
 */
function dragHostShape(container) {
  return {
    containerTag: container.tagName,
    // SortableJS indexes evt.from.children[oldIndex], so the full child list
    // matters, not just the rows carrying the attributes.
    childTags: Array.from(container.children).map((el) => el.tagName),
    childDraggableAttrs: Array.from(container.children).map((el) => el.getAttribute('data-draggable')),
    rows: Array.from(container.querySelectorAll('[data-collection-id]')).map((el) => ({
      tag: el.tagName,
      // depth + path relative to the Sortable container
      path: indexPath(el, container),
      collectionId: el.getAttribute('data-collection-id'),
      draggable: el.getAttribute('data-draggable'),
      // Sortable's `draggable:` selector must still match exactly these rows
      matchesDraggableSelector: el.matches('[data-draggable="true"]'),
      // Sortable's `handle:` selector, and where the handle sits inside the row
      handlePath: el.querySelector('.nav-drag-handle')
        ? indexPath(el.querySelector('.nav-drag-handle'), el)
        : null,
      // the right-click hint P4 deliberately kept on these rows
      title: el.getAttribute('title')
    })),
    // the exact readback main.jsx:359 performs
    orderedIds: Array.from(container.querySelectorAll('[data-draggable="true"]')).map((el) =>
      el.getAttribute('data-collection-id')
    )
  };
}

function renderNav(Component, props = {}) {
  const { container, rerender, unmount } = render(<Component {...baseProps} {...props} />);
  const host = container.querySelector('[data-nav-sortable="true"]');
  return { host, container, rerender, unmount };
}

afterEach(cleanup);

describe('the nav SortableJS host survives the style-contract migration', () => {
  it('renders a byte-for-byte identical drag-host shape to the P5 baseline', () => {
    const before = renderNav(SidebarP5Baseline);
    const beforeShape = dragHostShape(before.host);
    before.unmount();

    const after = renderNav(Sidebar);
    const afterShape = dragHostShape(after.host);

    // A sanity floor, so a shape of "nothing" can never pass by matching.
    expect(beforeShape.rows).toHaveLength(4);
    expect(beforeShape.orderedIds).toEqual(['c1', 'c2']);
    expect(beforeShape.rows[0].path).toEqual([1]);
    expect(beforeShape.rows[0].handlePath).toEqual([0]);

    expect(afterShape).toEqual(beforeShape);
  });

  it('keeps the host a direct-child list: every row is depth 1 under the container', () => {
    const { host } = renderNav(Sidebar);
    for (const row of host.querySelectorAll('[data-collection-id]')) {
      expect(row.parentElement).toBe(host);
      expect(indexPath(row, host)).toHaveLength(1);
    }
    // The "all collections" row is the container's first child in both versions;
    // the collection rows follow it in `collections` order.
    expect(Array.from(host.children).map((el) => el.getAttribute('data-collection-id'))).toEqual([
      null,
      'c1',
      'c2',
      'c3',
      'c4'
    ]);
  });

  it('a real Sortable instantiated on it reads back the same order as on the baseline', () => {
    const options = { draggable: '[data-draggable="true"]', handle: '.nav-drag-handle' };

    const before = renderNav(SidebarP5Baseline);
    const beforeSortable = new Sortable(before.host, options);
    const beforeOrder = beforeSortable.toArray
      ? Array.from(before.host.querySelectorAll(options.draggable)).map((el) =>
          el.getAttribute('data-collection-id')
        )
      : null;
    // Sortable rewrites nothing structural on construction, but prove that too.
    const beforeChildCount = before.host.children.length;
    beforeSortable.destroy();
    before.unmount();

    const after = renderNav(Sidebar);
    const afterSortable = new Sortable(after.host, options);
    const afterOrder = Array.from(after.host.querySelectorAll(options.draggable)).map((el) =>
      el.getAttribute('data-collection-id')
    );
    const afterChildCount = after.host.children.length;
    afterSortable.destroy();

    expect(beforeOrder).toEqual(['c1', 'c2']);
    expect(afterOrder).toEqual(beforeOrder);
    expect(afterChildCount).toBe(beforeChildCount);
  });

  it('keeps the shape stable across a re-render, as the baseline does', () => {
    const { host, rerender, container } = renderNav(Sidebar);
    const first = dragHostShape(host);

    // Same list, different selection — the re-render path a click takes.
    rerender(<Sidebar {...baseProps} activeCollectionId="c1" />);
    const rehost = container.querySelector('[data-nav-sortable="true"]');
    expect(rehost).toBe(host); // React reused the host node, it did not remount
    expect(dragHostShape(rehost)).toEqual(first);
  });
});

/** Every CSS property declared inline anywhere inside the rail. */
function inlineStyleProps(container) {
  const props = new Set();
  for (const el of container.querySelectorAll('aside[style], aside [style]')) {
    for (let i = 0; i < el.style.length; i += 1) props.add(el.style.item(i));
  }
  return [...props].sort();
}

describe('Sidebar is free of hand-written style', () => {
  it('declares nothing inline but the one property a vendored primitive sets itself', () => {
    // The only inline style left in the rail is Radix's own
    // `pointer-events: none` on SelectValue
    // (@radix-ui/react-select/dist/index.mjs:251) — a behaviour, not a colour,
    // and in a file P5b is forbidden to edit. Everything else is a token class.
    for (const collapsed of [false, true]) {
      const { container, unmount } = renderNav(Sidebar, { collapsed });
      expect(inlineStyleProps(container)).toEqual(collapsed ? [] : ['pointer-events']);
      unmount();
    }
  });

  it('the baseline it replaces declared colours inline — so the check above can fail', () => {
    const { container, unmount } = renderNav(SidebarP5Baseline);
    const expanded = inlineStyleProps(container);
    expect(expanded).toEqual(expect.arrayContaining(['background', 'color', 'border-color']));
    unmount();

    const collapsedRail = renderNav(SidebarP5Baseline, { collapsed: true });
    expect(inlineStyleProps(collapsedRail.container)).toEqual(
      expect.arrayContaining(['background', 'color', 'border-color', 'opacity'])
    );
  });
});

/* The style contract is enforced by scripts/verify-ui.sh gate 12 as counts.
   What a count cannot see is tailwind-merge *deleting* a class on the way to
   those zeros: `cn()` is twMerge, so an override can silently drop a class from
   a conflicting group it was never meant to touch (P3 lost `ring-[…]` this way,
   and this phase lost `leading-none` off shadcn's Label until it was restated).
   These assertions resolve the merged strings the browser will actually get. */
describe('tailwind-merge resolves the overrides the way the file intends', () => {
  const classesOf = (el) => el.className.split(/\s+/);

  it('the select trigger swaps surface colours without losing its focus ring', () => {
    const { container } = renderNav(Sidebar);
    const trigger = classesOf(container.querySelector('#tabhub-source-select'));

    // the swap P4's inline style used to make
    expect(trigger).toContain('bg-background');
    expect(trigger).not.toContain('bg-transparent');
    expect(trigger).toContain('shadow-none');
    expect(trigger).not.toContain('shadow-sm');
    // …and the ring survives it, colour included. `ring-1` and `ring-<colour>`
    // sit in conflicting groups; a ring opacity written here would delete it.
    expect(trigger).toContain('focus:ring-1');
    expect(trigger).toContain('focus:ring-ring');
    // the contract's radius for a select trigger
    expect(trigger).toContain('rounded-md');
  });

  it('the section labels keep leading-none through the text-xs override', () => {
    const { container } = renderNav(Sidebar);
    const label = classesOf(container.querySelector('label[for="tabhub-source-select"]'));
    expect(label).toContain('text-xs');
    expect(label).not.toContain('text-sm');
    // font-size lists leading-* as a conflicting group in tailwind-merge, so
    // this only holds because SECTION_LABEL_CLASS restates it after text-xs.
    expect(label).toContain('leading-none');
  });

  it('nav rows beat the cva: left-aligned, auto-height, weight driven by state', () => {
    const { container } = renderNav(Sidebar, { activeCollectionId: 'c1' });
    const active = classesOf(container.querySelector('[data-collection-id="c1"]'));
    const idle = classesOf(container.querySelector('[data-collection-id="c2"]'));

    for (const row of [active, idle]) {
      expect(row).toContain('justify-start');
      expect(row).not.toContain('justify-center'); // Button's cva default
      expect(row).toContain('h-auto');
      expect(row).not.toContain('h-9'); // Button's default size
      expect(row).toContain('px-2');
      expect(row).not.toContain('px-4');
      expect(row).not.toContain('font-medium'); // Button's cva default
    }
    expect(active).toContain('font-semibold');
    expect(active).toContain('bg-secondary');
    expect(idle).toContain('font-normal');
    expect(idle).not.toContain('bg-secondary');
  });

  it('the collapse toggle keeps its filled surface and its own hover', () => {
    const { container } = renderNav(Sidebar);
    const toggle = classesOf(container.querySelector('aside [aria-label]'));
    expect(toggle).toContain('bg-accent');
    expect(toggle).toContain('hover:bg-accent/80');
    expect(toggle).not.toContain('hover:bg-accent'); // superseded, not duplicated
    expect(toggle).toContain('h-7');
    expect(toggle).not.toContain('h-9'); // size="icon" default
  });
});

/* Two traps P5a hit in `CollectionCard`, asserted here because the same shapes
   were reachable in this file and were deliberately not taken. */
describe('the traps P5a found do not exist here', () => {
  it('gives no control two focus rings', () => {
    // Composing two vendored class sets can leave both rings alive: shadcn
    // Badge's `focus:ring-2 ring-offset-2` and Button's `focus-visible:ring-1`
    // sit in *different* tailwind-merge conflict groups, so neither deletes the
    // other and the control renders two. Nothing here composes two such sets —
    // there is no Badge in this file and the count chip is plain meta text.
    for (const collapsed of [false, true]) {
      const { container, unmount } = renderNav(Sidebar, { collapsed });
      const doubled = Array.from(container.querySelectorAll('aside *')).filter((el) => {
        const c = String(el.className);
        return /(^|\s)focus:ring-\d/.test(c) && /(^|\s)focus-visible:ring-\d/.test(c);
      });
      expect(doubled.map((el) => el.tagName)).toEqual([]);
      unmount();
    }
  });

  it('nests no button inside another button', () => {
    // `<Button>` renders a real <button>, and a button inside a button is
    // invalid HTML React does not warn about — P5a had to turn a card header
    // into a <div> row for exactly this reason. The nav rows here contain only
    // spans and svgs, so each SortableJS child stays a single <button> and its
    // element, depth, index and order are untouched (proven above).
    for (const collapsed of [false, true]) {
      const { container, unmount } = renderNav(Sidebar, { collapsed });
      expect(container.querySelectorAll('aside button button')).toHaveLength(0);
      const host = container.querySelector('[data-nav-sortable="true"]');
      if (host) {
        expect(Array.from(host.children).every((el) => el.tagName === 'BUTTON')).toBe(true);
      }
      unmount();
    }
  });

  it('scrolls both rails natively — no ScrollArea, so no viewport between host and rows', () => {
    // Bundle: @radix-ui/react-scroll-area is not in the bundle and must not be.
    // Structure: its Viewport would also interpose a display:table wrapper.
    for (const collapsed of [false, true]) {
      const { container, unmount } = renderNav(Sidebar, { collapsed });
      expect(container.querySelectorAll('[data-radix-scroll-area-viewport]')).toHaveLength(0);
      const scroller = container.querySelector('aside nav');
      expect(scroller.className).toContain('overflow-y-auto');
      unmount();
    }
  });
});
