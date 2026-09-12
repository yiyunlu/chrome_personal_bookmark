import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Sortable from 'sortablejs';
import { Sidebar } from '../components/Sidebar';

/* P4: the sidebar's icon-only buttons trade their `title` attributes for a Radix
   tooltip plus an explicit `aria-label`, and its two native selects become
   shadcn `Select`s. */

const collections = [
  { id: 'c1', title: '工作', parentId: 's1', editable: true, deletable: true, cards: [{ id: 'b1' }] },
  { id: 'c2', title: '阅读', parentId: 's1', editable: true, deletable: true, cards: [] }
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
  activeCollectionId: 'all',
  onCollectionSelect: vi.fn(),
  canSortCollections: true,
  onCollectionContextMenu: vi.fn(),
  collapsed: false,
  onToggleCollapse: vi.fn(),
  onViewTrash: vi.fn(),
  onOpenSettings: vi.fn(),
  hasTrash: true
};

const renderSidebar = (props = {}) => render(<Sidebar {...baseProps} {...props} />);

/** Radix opens a tooltip on focus with no delay; hover needs its timer. */
const openTooltip = (trigger) => fireEvent.focus(trigger);

describe('Sidebar icon-only buttons', () => {
  it('name themselves with aria-label instead of title', () => {
    renderSidebar({ collapsed: true });

    for (const name of ['展开侧栏', '全部收藏', '回收站', '设置', '工作']) {
      const button = screen.getByRole('button', { name });
      expect(button).not.toHaveAttribute('title');
    }
    // Nothing in the collapsed rail leans on a title tooltip any more.
    expect(document.querySelectorAll('aside [title]')).toHaveLength(0);
  });

  it('opens a tooltip carrying the same text the title used to', () => {
    renderSidebar({ collapsed: true });
    const trigger = screen.getByRole('button', { name: '设置' });
    expect(trigger).not.toHaveAttribute('aria-describedby');

    openTooltip(trigger);

    expect(screen.getByRole('tooltip')).toHaveTextContent('设置');
    expect(trigger).toHaveAttribute('aria-describedby');
  });

  it('still fires its click handler through the tooltip trigger', () => {
    const onViewTrash = vi.fn();
    renderSidebar({ collapsed: true, onViewTrash });

    fireEvent.click(screen.getByRole('button', { name: '回收站' }));
    expect(onViewTrash).toHaveBeenCalledTimes(1);
  });

  it('keeps the theme buttons named while they are icon-only at narrow widths', () => {
    renderSidebar();
    // The visible span is `hidden sm:inline`, so the label has to survive as an
    // aria-label too.
    expect(screen.getByRole('button', { name: '跟随系统' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '浅色' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '深色' })).toBeInTheDocument();
  });
});

describe('no tooltip opens while a SortableJS drag is in flight', () => {
  /* This drives a *real* Sortable instance over a real pointerdown, because the
     guard reads exactly the statics Sortable sets: `Sortable.dragged` from the
     pointerdown on a handle through to `_nulling()` on drop. Nothing here
     asserts on a class name Sortable would only apply in a browser. */
  let sortable = null;
  let list = null;

  function startDrag() {
    list = document.createElement('ul');
    list.innerHTML = '<li><span class="handle">h</span>one</li><li><span class="handle">h</span>two</li>';
    document.body.appendChild(list);
    sortable = new Sortable(list, { handle: '.handle' });
    fireEvent.pointerDown(list.querySelector('.handle'), { button: 0 });
  }

  afterEach(() => {
    if (list) fireEvent.pointerUp(document);
    if (sortable) sortable.destroy();
    if (list) list.remove();
    sortable = null;
    list = null;
  });

  it('refuses to open mid-drag and opens again once the drag ends', () => {
    renderSidebar({ collapsed: true });
    const trigger = screen.getByRole('button', { name: '设置' });

    startDrag();
    expect(Sortable.dragged).toBeTruthy(); // the guard's actual input

    openTooltip(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Drop, and the same interaction works again.
    fireEvent.pointerUp(document);
    expect(Sortable.dragged).toBeFalsy();
    openTooltip(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent('设置');
  });
});

describe('Sidebar selects', () => {
  it('exposes both as comboboxes named by their visible label', () => {
    renderSidebar();
    expect(screen.getByRole('combobox', { name: '书签源' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '语言' })).toBeInTheDocument();
  });

  it('shows the current value and reports a change through the same prop', () => {
    const onLanguageChange = vi.fn();
    renderSidebar({ languageSetting: 'en', onLanguageChange });

    const trigger = screen.getByRole('combobox', { name: '语言' });
    expect(trigger).toHaveTextContent('English');

    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: '中文' }));
    expect(onLanguageChange).toHaveBeenCalledWith('zh-CN');
  });

  it('lets the popper list size itself instead of shadcn’s one-row viewport', () => {
    renderSidebar();
    const trigger = screen.getByRole('combobox', { name: '语言' });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    // Class-string assertions, deliberately: jsdom loads no compiled CSS, so it
    // can tell you the override is applied but never that it renders. Both are
    // on the browser smoke list.
    const content = document.querySelector('[data-radix-select-viewport]').parentElement;
    expect(content.className).toContain('[&_[data-radix-select-viewport]]:h-auto');
    // Above DialogShell's LAYER_TOP (z-100), matching P3's forms.
    expect(content.className).toContain('z-[110]');
  });
});
