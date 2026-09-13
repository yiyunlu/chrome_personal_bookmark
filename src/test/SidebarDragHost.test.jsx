import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Sortable from 'sortablejs';
import { Sidebar } from '../components/Sidebar';

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

/**
 * The drag-host shape, captured as a literal rather than by rendering a frozen
 * copy of the component. Re-dumped in P6 when the host moved from the <nav> to
 * an inner <div> holding only the folder rows — so the design's section label
 * could sit between the all-collections row and the folders. The all-row is no
 * longer a child of the host at all; the four folder rows are its whole child
 * list, at paths [0]..[3].
 *
 * This used to be `src/test/fixtures/SidebarP5Baseline.jsx` — 384 lines of
 * duplicated component. That copy proved something only at the instant of the
 * migration: the moment anyone "modernised" it, the comparison would have kept
 * passing while proving nothing, and it blocked a legitimate restructure in S1
 * because the test deep-equalled its child list. A literal cannot rot, a reader
 * can check it in one screen, and it fails on exactly the same regressions.
 */
const BASELINE_SHAPE = {
  containerTag: 'DIV',
  childTags: ['BUTTON', 'BUTTON', 'BUTTON', 'BUTTON'],
  childDraggableAttrs: ['true', 'true', 'false', 'false'],
  rows: [
    {
      tag: 'BUTTON',
      path: [0],
      collectionId: 'c1',
      draggable: 'true',
      matchesDraggableSelector: true,
      handlePath: [0],
      title: '右键可编辑目录'
    },
    {
      tag: 'BUTTON',
      path: [1],
      collectionId: 'c2',
      draggable: 'true',
      matchesDraggableSelector: true,
      handlePath: [0],
      title: '右键可编辑目录'
    },
    {
      tag: 'BUTTON',
      path: [2],
      collectionId: 'c3',
      draggable: 'false',
      matchesDraggableSelector: false,
      handlePath: [0],
      title: '右键可编辑目录'
    },
    {
      tag: 'BUTTON',
      path: [3],
      collectionId: 'c4',
      draggable: 'false',
      matchesDraggableSelector: false,
      handlePath: [0],
      title: ''
    }
  ],
  orderedIds: ['c1', 'c2']
};

afterEach(cleanup);

describe('the nav SortableJS host survives the style-contract migration', () => {
  it('renders a byte-for-byte identical drag-host shape to the P5 baseline', () => {
    const after = renderNav(Sidebar);
    const afterShape = dragHostShape(after.host);

    // A sanity floor, so a shape of "nothing" can never pass by matching.
    expect(afterShape.rows).toHaveLength(4);
    expect(afterShape.orderedIds).toEqual(['c1', 'c2']);
    expect(afterShape.rows[0].path).toEqual([0]);
    expect(afterShape.rows[0].handlePath).toEqual([0]);

    expect(afterShape).toEqual(BASELINE_SHAPE);
  });

  it('keeps the host a direct-child list: every row is depth 1 under the container', () => {
    const { host } = renderNav(Sidebar);
    for (const row of host.querySelectorAll('[data-collection-id]')) {
      expect(row.parentElement).toBe(host);
      expect(indexPath(row, host)).toHaveLength(1);
    }
    // The host holds ONLY the folder rows, in `collections` order. The
    // all-collections row and the section label live in the <nav> above it,
    // which is what lets the label sit where the design puts it.
    expect(Array.from(host.children).map((el) => el.getAttribute('data-collection-id'))).toEqual([
      'c1',
      'c2',
      'c3',
      'c4'
    ]);
  });

  it('a real Sortable instantiated on it reads back the same order as on the baseline', () => {
    const options = { draggable: '[data-draggable="true"]', handle: '.nav-drag-handle' };

    const after = renderNav(Sidebar);
    // Sortable rewrites nothing structural on construction, so the child list it
    // sees must still be the baseline's.
    const beforeOrder = BASELINE_SHAPE.orderedIds;
    const beforeChildCount = BASELINE_SHAPE.childTags.length;
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
  it('declares nothing inline but the two things that cannot be a class', () => {
    // Two exceptions, both structural rather than sloppy:
    //   `pointer-events` — Radix's own on SelectValue
    //   (@radix-ui/react-select/dist/index.mjs:251), a behaviour, not a colour,
    //   in a file this phase may not edit.
    //   `background-color` — the collapsed rail's identity tile. Its tint is hashed
    //   from the collection name at runtime, so there is no class that could
    //   carry it. The tile exists because collapsed, every row drew the same
    //   folder glyph and the rail could not be read at a glance.
    // Everything else is a token class, which is what this test is really for.
    const { container, unmount } = renderNav(Sidebar, { collapsed: false });
    expect(inlineStyleProps(container)).toEqual(['pointer-events']);
    unmount();

    const rail = renderNav(Sidebar, { collapsed: true });
    // backgroundColor, not the `background` shorthand: jsdom expands a shorthand
    // into all eight longhands, which would make this assertion unreadable.
    expect(inlineStyleProps(rail.container)).toEqual(['background-color']);
    rail.unmount();
  });

  it('the check above can fail — a hand-styled rail trips it', () => {
    // The pre-migration Sidebar declared its colours inline, and this used to
    // render that whole frozen component to prove the assertion above is not
    // vacuous. A stub with the same shape proves it just as well and cannot rot.
    function HandStyledRail() {
      // Wrapped in <aside> because inlineStyleProps scopes its sweep there, the
      // same way the real rail is shaped.
      return (
        <aside>
          <nav data-nav-sortable="true">
          <button
            type="button"
            data-collection-id="c1"
            data-draggable="true"
            style={{ background: 'var(--sidebar-bg)', color: 'var(--text)', borderColor: 'var(--panel-border)' }}
          >
              <span className="nav-drag-handle" />
            </button>
          </nav>
        </aside>
      );
    }
    const { container, unmount } = render(<HandStyledRail />);
    expect(inlineStyleProps(container)).toEqual(
      expect.arrayContaining(['background', 'color', 'border-color'])
    );
    unmount();
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

  it('the select trigger takes the design geometry without losing its focus ring', () => {
    const { container } = renderNav(Sidebar);
    const trigger = classesOf(container.querySelector('#tabhub-source-select'));

    // S1: the design's control is 30px tall, 6px-cornered (its 7px rounded to
    // the nearest value the scale has), on --line rather than shadcn's
    // --ui-input, with 12px text and no shadow. Every one of these displaces a
    // vendored class, so each assertion fails if tailwind-merge resolves the
    // pair the other way round.
    expect(trigger).toContain('h-[30px]');
    expect(trigger).not.toContain('h-9'); // SelectTrigger's own height
    expect(trigger).toContain('rounded-sm');
    expect(trigger).not.toContain('rounded-md');
    expect(trigger).toContain('border-border');
    expect(trigger).not.toContain('border-input');
    expect(trigger).toContain('px-2');
    expect(trigger).not.toContain('px-3');
    expect(trigger).toContain('text-xs');
    expect(trigger).not.toContain('text-sm');
    expect(trigger).toContain('shadow-none');
    expect(trigger).not.toContain('shadow-sm');
    // …and the ring survives it, colour included. `ring-1` and `ring-<colour>`
    // sit in conflicting groups; a ring opacity written here would delete it.
    expect(trigger).toContain('focus:ring-1');
    expect(trigger).toContain('focus:ring-ring');
  });

  /* P5b pinned this mechanism on the `<label>` above the source select. S1
     deletes that label — the design's switcher shows a glyph and the value and
     nothing else — so the same mechanism is pinned on the two places S1 does
     write a font-size override next to a `leading-*`: the nav row and the mono
     count. Nothing is lost: it is the same conflicting group, on live strings. */
  it('a font-size override does not delete the leading it sits next to', () => {
    const { container } = renderNav(Sidebar);

    const row = classesOf(container.querySelector('[data-collection-id="c1"]'));
    expect(row).toContain('text-[13px]');
    // tailwind-merge lists leading-* among font-size's conflicting groups, so
    // this only holds because NAV_ROW_CLASS restates it *after* text-[13px].
    expect(row).toContain('leading-none');

    const count = classesOf(container.querySelector('[data-collection-id="c1"] [data-nav-count]'));
    expect(count).toContain('text-[10.5px]');
    expect(count).toContain('leading-none');
    expect(count).toContain('font-mono');
  });

  it('nav rows beat the cva: left-aligned, 30px, weight driven by state', () => {
    const { container } = renderNav(Sidebar, { activeCollectionId: 'c1' });
    const active = classesOf(container.querySelector('[data-collection-id="c1"]'));
    const idle = classesOf(container.querySelector('[data-collection-id="c2"]'));

    for (const row of [active, idle]) {
      expect(row).toContain('justify-start');
      expect(row).not.toContain('justify-center'); // Button's cva default
      expect(row).toContain('h-[30px]'); // the design's row height
      expect(row).not.toContain('h-9'); // Button's default size
      expect(row).toContain('rounded-sm'); // the design's 6px row corner
      expect(row).not.toContain('rounded-md'); // Button's cva default
      expect(row).toContain('px-2');
      expect(row).not.toContain('px-4');
      expect(row).toContain('font-normal');
      expect(row).not.toContain('font-medium'); // Button's cva default
    }
    // Active is the design's --accentSoft fill with the accent text, not a
    // heavier weight.
    expect(active).toContain('bg-primary/10');
    expect(active).toContain('text-primary');
    expect(idle).not.toContain('bg-primary/10');
    expect(idle).toContain('text-muted-foreground');
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

/* S1 — the elements the TabHub design adds to the rail. Each of these asserts
   something the component actually renders, and each was mutation-checked by
   breaking the source and confirming this exact test went red. */
describe('S1: the design’s sidebar elements', () => {
  const classesOf = (el) => el.className.split(/\s+/);
  // 2 + 0 + 1 + 0 across the four fixture collections.
  const TOTAL_CARDS = 3;

  it('shows the rail’s total bookmark count in the logo block, in mono', () => {
    const { container } = renderNav(Sidebar);
    const total = container.querySelector('aside [data-total-count]');

    expect(total).not.toBeNull();
    expect(total.textContent).toBe(String(TOTAL_CARDS));
    // It is the count that moves with the data, not a constant.
    expect(TOTAL_CARDS).toBe(collections.reduce((n, c) => n + c.cards.length, 0));

    const cls = classesOf(total);
    expect(cls).toContain('font-mono');
    expect(cls).toContain('text-[10.5px]');
    expect(cls).toContain('text-faint'); // the design's third text level
    expect(cls).toContain('ml-auto'); // right-aligned in the logo row
  });

  it('re-counts when the collections change', () => {
    const { container, rerender } = renderNav(Sidebar);
    expect(container.querySelector('aside [data-total-count]').textContent).toBe('3');

    rerender(
      <Sidebar
        {...baseProps}
        collections={[{ ...collections[0], cards: [{ id: 'x' }, { id: 'y' }, { id: 'z' }, { id: 'w' }] }]}
      />
    );
    expect(container.querySelector('aside [data-total-count]').textContent).toBe('4');
  });

  it('labels the folder list with the design’s section label', () => {
    const { container, host } = renderNav(Sidebar);
    const label = container.querySelector('[data-nav-section-label]');

    expect(label).not.toBeNull();
    expect(label.textContent).toBe('分类');

    const cls = classesOf(label);
    expect(cls).toContain('text-[10px]');
    expect(cls).toContain('font-semibold');
    expect(cls).toContain('uppercase');
    expect(cls).toContain('tracking-[0.09em]');
    expect(cls).toContain('text-faint');

    // It must NOT be inside the Sortable host: every element child of that
    // container is a row SortableJS indexes by position.
    expect(host.contains(label)).toBe(false);
  });

  it('renders no section label in the collapsed rail', () => {
    const { container } = renderNav(Sidebar, { collapsed: true });
    expect(container.querySelector('[data-nav-section-label]')).toBeNull();
  });

  it("encodes folder depth as the row's own left padding", () => {
    const { container } = renderNav(Sidebar);
    const rowOf = (id) => container.querySelector(`[data-collection-id="${id}"][data-nav-indent]`);

    // This used to be a leading spacer element. A zero-width spacer still earns
    // the row's `gap-1.5`, so every root folder's glyph sat 6px right of the
    // "all collections" glyph above it — a ragged left edge in a 232px rail.
    // Putting the indent on the row keeps the design's 22-vs-8 delta (14px) and
    // puts the two glyphs on one vertical line.
    expect(rowOf('c3').getAttribute('data-nav-indent')).toBe('nested');
    expect(classesOf(rowOf('c3'))).toContain('pl-[22px]');
    for (const id of ['c1', 'c2', 'c4']) {
      expect(rowOf(id).getAttribute('data-nav-indent')).toBe('root');
      expect(classesOf(rowOf(id))).toContain('pl-2');
    }
    // No spacer element survives — its gap was the whole problem.
    expect(container.querySelector('[data-collection-id] > span[aria-hidden]')).toBeNull();
  });

  it('puts a root folder glyph on the same line as the all-collections glyph', () => {
    // Both rows are px-2 with gap-1.5 and a 16px leading element (the handle, and
    // the all-row's matching gutter), so the glyph lands at 8+16+6 = 30px in each.
    // Asserted as structure because jsdom has no layout: same padding, same gap,
    // same number of elements before the glyph.
    const { container } = renderNav(Sidebar);
    const allRow = container.querySelector('[data-nav-all]');
    const folderRow = container.querySelector('[data-collection-id="c1"][data-nav-indent]');
    // Same left padding, same gap, and the same number of elements before the
    // glyph — so the glyphs land on the same x with no layout engine needed.
    for (const row of [allRow, folderRow]) {
      expect(classesOf(row)).toContain('pl-2');
      expect(classesOf(row)).toContain('gap-1.5');
    }
    // The glyph is the row's own svg child. The drag handle also contains an svg,
    // so a descendant search would find index 0 and prove nothing.
    const glyphIndex = (row) =>
      Array.from(row.children).findIndex((child) => child.tagName.toLowerCase() === 'svg');
    expect(glyphIndex(folderRow)).toBe(glyphIndex(allRow));
    expect(glyphIndex(folderRow)).toBe(1); // the handle / its matching gutter
  });

  it('follows the active source: the same folder is nested or not by prop', () => {
    const { container, rerender } = renderNav(Sidebar);
    const indent = () => container.querySelector('[data-collection-id="c3"][data-nav-indent]');
    expect(indent().getAttribute('data-nav-indent')).toBe('nested');

    rerender(<Sidebar {...baseProps} activeSourceId="other" />);
    expect(indent().getAttribute('data-nav-indent')).toBe('root');
  });

  it('sets every nav count in mono, faint on folders and accent on the all row', () => {
    const { container } = renderNav(Sidebar);
    const counts = container.querySelectorAll('aside [data-nav-count]');
    // one per row: the "all collections" row plus the four folders. Swept from
    // the rail, not the Sortable host — the all-row sits outside the host now.
    expect(counts).toHaveLength(5);
    for (const el of counts) expect(classesOf(el)).toContain('font-mono');

    // the "all collections" row carries the rail total, in the accent
    expect(counts[0].textContent).toBe(String(TOTAL_CARDS));
    expect(classesOf(counts[0])).toContain('text-primary');

    // folder counts are the design's --faint, and read their own card list
    expect(Array.from(counts).slice(1).map((el) => el.textContent)).toEqual(['2', '0', '1', '0']);
    expect(classesOf(container.querySelector('aside [data-collection-id="c1"] [data-nav-count]'))).toContain('text-faint');
    // ...except the selected one, which takes the accent with the rest of the row
    expect(classesOf(container.querySelector('aside [data-collection-id="c2"] [data-nav-count]'))).toContain('text-primary');
  });

  it('keeps all three theme options in the bottom bar segmented control', () => {
    const { container } = renderNav(Sidebar);
    const group = container.querySelector('aside [role="group"]');

    expect(group).not.toBeNull();
    expect(group.getAttribute('aria-label')).toBe('主题');
    const buttons = group.querySelectorAll('button');
    // The design drew two; behaviour keeps three.
    expect(buttons).toHaveLength(3);
    expect(Array.from(buttons).map((b) => b.getAttribute('aria-label'))).toEqual(['跟随系统', '浅色', '深色']);
    // 26x22 inside a 2px-padded, bordered, 6px-cornered track
    expect(classesOf(buttons[0])).toEqual(expect.arrayContaining(['h-[22px]', 'w-[26px]', 'rounded-sm']));
    expect(classesOf(group)).toEqual(expect.arrayContaining(['rounded-sm', 'border', 'border-border', 'p-0.5']));
  });

  it('takes the design’s 232px rail width, and the collapsed rail keeps its own', () => {
    const { container, unmount } = renderNav(Sidebar);
    expect(classesOf(container.querySelector('aside'))).toContain('w-[232px]');
    unmount();

    const collapsedRail = renderNav(Sidebar, { collapsed: true });
    expect(classesOf(collapsedRail.container.querySelector('aside'))).toContain('w-14');
  });
});
