import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Toolbar, BatchToolbar } from '../components/Toolbar';
import { t } from '../lib/i18n';

/* S2 — the toolbar rebuilt on TabHub.dc.html's header.

   These cover the two things the redesign could plausibly break: the existing
   behaviour (every handler, the disabled states, the manage-mode active look)
   and the two new optional props, whose whole point is that the component must
   behave sensibly when S3 has not shipped them yet.

   The `/`-focuses-the-search-field test deliberately lives in forms.test.jsx,
   where it is driven through the real useKeyboardShortcuts hook rather than a
   stand-in; duplicating it here with a fake would weaken it. */

const HANDLERS = () => ({
  onSaveTabs: vi.fn(),
  onToggleManage: vi.fn(),
  onAutoOrganize: vi.fn(),
  onAICategorize: vi.fn(),
  onCheckDeadLinks: vi.fn(),
  onNewCollection: vi.fn(),
  onSearchChange: vi.fn()
});

function renderToolbar(props = {}) {
  const handlers = HANDLERS();
  const utils = render(
    <Toolbar
      activeSource={null}
      activeSourceId="src-1"
      tabHubRootId="root-1"
      manageMode={false}
      autoOrganizing={false}
      search=""
      searchInputRef={React.createRef()}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, handlers };
}

const viewButton = (which) => screen.getByRole('button', { name: t(which) });
const deadLinkButton = () => screen.getByRole('button', { name: new RegExp(t('deadLinkCheck')) });

describe('Toolbar — grid/list view control (the S2/S3 interface)', () => {
  it('renders both view options inside a labelled group', () => {
    renderToolbar({ onViewChange: vi.fn() });
    const group = screen.getByRole('group', { name: t('viewMode') });

    expect(within(group).getAllByRole('button')).toHaveLength(2);
    expect(viewButton('gridView')).toBeInTheDocument();
    expect(viewButton('listView')).toBeInTheDocument();
  });

  it('treats an absent `view` as grid', () => {
    renderToolbar({ onViewChange: vi.fn() });

    expect(viewButton('gridView')).toHaveAttribute('aria-pressed', 'true');
    expect(viewButton('listView')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflects view="list"', () => {
    renderToolbar({ view: 'list', onViewChange: vi.fn() });

    expect(viewButton('listView')).toHaveAttribute('aria-pressed', 'true');
    expect(viewButton('gridView')).toHaveAttribute('aria-pressed', 'false');
  });

  it('gives the selected option the secondary variant and the other ghost (V2-A)', () => {
    renderToolbar({ view: 'list', onViewChange: vi.fn() });

    expect(viewButton('listView').className).toContain('bg-secondary');
    expect(viewButton('listView').className).toContain('text-secondary-foreground');
    expect(viewButton('gridView').className).not.toContain('bg-secondary');
  });

  it('sizes each view cell at the design’s 26x26 geometry', () => {
    renderToolbar({ onViewChange: vi.fn() });

    expect(viewButton('gridView').className).toContain('h-[26px]');
    expect(viewButton('gridView').className).toContain('w-[26px]');
  });

  it('reports the other view to onViewChange', () => {
    const onViewChange = vi.fn();
    renderToolbar({ view: 'grid', onViewChange });

    fireEvent.click(viewButton('listView'));
    expect(onViewChange).toHaveBeenCalledWith('list');

    fireEvent.click(viewButton('gridView'));
    expect(onViewChange).toHaveBeenLastCalledWith('grid');
  });

  it('renders inert — not omitted — when neither prop is passed', () => {
    renderToolbar();

    // Still there, so the header geometry does not shift when S3 lands...
    expect(screen.getByRole('group', { name: t('viewMode') })).toBeInTheDocument();
    // ...but nothing can be driven through it.
    expect(viewButton('gridView')).toBeDisabled();
    expect(viewButton('listView')).toBeDisabled();

    fireEvent.click(viewButton('listView'));
    expect(viewButton('gridView')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Toolbar — dead-link count badge', () => {
  it('shows the count inside the dead-link button when it is non-zero', () => {
    renderToolbar({ deadLinkCount: 3 });
    const badge = within(deadLinkButton()).getByText('3');

    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('font-mono');
    expect(badge.className).toContain('bg-primary/10');
    expect(badge.className).toContain('text-primary');
  });

  it('shows no badge when the count is absent', () => {
    renderToolbar();

    expect(within(deadLinkButton()).queryByText(/^\d+$/)).toBeNull();
  });

  it('shows no badge when the count is zero', () => {
    renderToolbar({ deadLinkCount: 0 });

    expect(within(deadLinkButton()).queryByText(/^\d+$/)).toBeNull();
  });
});

describe('Toolbar — the behaviour the redesign must not change', () => {
  it('still routes every action button to its handler', () => {
    const { handlers } = renderToolbar();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('saveTabs')) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('autoOrganize')) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('aiCategorize')) }));
    fireEvent.click(deadLinkButton());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('newCollection')) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('enterManageMode')) }));

    expect(handlers.onSaveTabs).toHaveBeenCalledTimes(1);
    expect(handlers.onAutoOrganize).toHaveBeenCalledTimes(1);
    expect(handlers.onAICategorize).toHaveBeenCalledTimes(1);
    expect(handlers.onCheckDeadLinks).toHaveBeenCalledTimes(1);
    expect(handlers.onNewCollection).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleManage).toHaveBeenCalledTimes(1);
  });

  it('still reports typing back to the owner of the search string', () => {
    const { handlers } = renderToolbar();

    fireEvent.change(screen.getByRole('textbox', { name: t('searchPlaceholder') }), {
      target: { value: 'github' }
    });

    expect(handlers.onSearchChange).toHaveBeenCalledWith('github');
  });

  it('still disables auto-organize while it runs, and says so', () => {
    const { handlers } = renderToolbar({ autoOrganizing: true });
    const button = screen.getByRole('button', { name: new RegExp(t('autoOrganizing')) });

    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handlers.onAutoOrganize).not.toHaveBeenCalled();
  });

  it('still disables save tabs when there is no source and no root', () => {
    renderToolbar({ activeSourceId: null, tabHubRootId: null });

    expect(screen.getByRole('button', { name: new RegExp(t('saveTabs')) })).toBeDisabled();
  });

  it('gives manage mode the secondary variant and the exit label (V2-A)', () => {
    renderToolbar({ manageMode: true });
    const button = screen.getByRole('button', { name: new RegExp(t('exitManageMode')) });

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('bg-secondary');
    expect(button.className).toContain('text-secondary-foreground');
  });

  it('gives idle manage mode the outline variant and the enter label', () => {
    renderToolbar({ manageMode: false });
    const button = screen.getByRole('button', { name: new RegExp(t('enterManageMode')) });

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.className).toContain('border-input');
    expect(button.className).not.toContain('bg-secondary');
  });

  it('still names the active source when one is given', () => {
    renderToolbar({ activeSource: { id: 's1', title: 'Other bar', isTabHub: false } });

    expect(screen.getByText(/Other bar/)).toBeInTheDocument();
  });
});

describe('Toolbar — the design header, as resolved class strings', () => {
  it('gives the search field the design geometry and no inline colour', () => {
    renderToolbar();
    const field = screen.getByRole('textbox', { name: t('searchPlaceholder') });

    expect(field.className).toContain('h-[34px]');
    expect(field.className).toContain('rounded-md');
    expect(field.className).toContain('bg-card');
    expect(field.className).toContain('pl-8');
    expect(field.className).toContain('pr-10');
    expect(field.getAttribute('style')).toBeNull();
  });

  it('keeps the accent focus ring that twMerge once ate, as a token class', () => {
    renderToolbar();
    const field = screen.getByRole('textbox', { name: t('searchPlaceholder') });

    expect(field.className).toContain('focus-visible:ring-primary');
    expect(field.className).toContain('focus-visible:ring-2');
    // shadcn's own ring must be gone, or the ring is the wrong colour.
    expect(field.className).not.toContain('focus-visible:ring-ring');
  });

  it('pins the search type size against Input’s leftover md:text-sm', () => {
    renderToolbar();
    const field = screen.getByRole('textbox', { name: t('searchPlaceholder') });

    // The unprefixed class alone would lose to `md:text-sm` from 768px up.
    expect(field.className).toContain('md:text-[12.5px]');
    expect(field.className).not.toContain('md:text-sm');
  });

  it('puts the `/` hint in a bordered mono chip', () => {
    const { container } = renderToolbar();
    const kbd = container.querySelector('kbd');

    expect(kbd.textContent.trim()).toBe('/');
    expect(kbd.className).toContain('font-mono');
    expect(kbd.className).toContain('border-border');
    expect(kbd.className).toContain('rounded-sm');
  });

  it('fills only the save action and leaves the row-2 actions ghosted', () => {
    renderToolbar();
    const save = screen.getByRole('button', { name: new RegExp(t('saveTabs')) });
    const organize = screen.getByRole('button', { name: new RegExp(t('autoOrganize')) });

    expect(save.className).toContain('bg-primary');
    expect(save.className).toContain('text-primary-foreground');
    expect(save.className).toContain('h-[30px]');
    // shadcn's elevation is not in the design.
    expect(save.className).not.toContain('shadow ');

    expect(organize.className).toContain('text-muted-foreground');
    expect(organize.className).toContain('h-[30px]');
    expect(organize.className).not.toContain('bg-primary');
  });

  it('carries no inline colour anywhere in the header', () => {
    // Not a blanket zero-`[style]` assertion (V2-A introduces the sort
    // `Select`, whose vendored `SelectValue` always renders a
    // `style="pointer-events: none"` span — a Radix internal, not a colour).
    // The thing this test guards is the style contract's ban on inline
    // `var()`/hex colours; see dialogTokensP6a.test.jsx for the same pattern.
    const { container } = renderToolbar({
      manageMode: true,
      deadLinkCount: 2,
      view: 'list',
      onViewChange: vi.fn(),
      sortMode: 'title',
      onSortChange: vi.fn(),
      activeSource: { id: 's1', title: 'Bar', isTabHub: false }
    });

    const styled = Array.from(container.querySelectorAll('[style]')).map((el) => el.getAttribute('style'));
    expect(styled.every((s) => !/var\(--|#[0-9a-f]{3,8}\b|rgb/i.test(s))).toBe(true);
  });
});

describe('Toolbar — sort select (V2-A, new)', () => {
  it('exposes a labelled combobox with the four modes in spec order', () => {
    renderToolbar({ sortMode: 'manual', onSortChange: vi.fn() });

    const trigger = screen.getByRole('combobox', { name: t('sortMode') });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    const options = screen.getAllByRole('option').map((el) => el.textContent);
    expect(options).toEqual([t('sortManual'), t('sortRecent'), t('sortTitle'), t('sortDomain')]);
  });

  it('defaults to manual when no sortMode prop is given', () => {
    renderToolbar({ onSortChange: vi.fn() });

    expect(screen.getByRole('combobox', { name: t('sortMode') })).toHaveTextContent(t('sortManual'));
  });

  it('reports the chosen mode through onSortChange', () => {
    const onSortChange = vi.fn();
    renderToolbar({ sortMode: 'manual', onSortChange });

    const trigger = screen.getByRole('combobox', { name: t('sortMode') });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: t('sortRecent') }));

    expect(onSortChange).toHaveBeenCalledWith('recent');
  });

  it('sizes the trigger at the design’s 30px / 132px geometry', () => {
    renderToolbar();
    expect(screen.getByRole('combobox', { name: t('sortMode') }).className).toContain('h-[30px]');
    expect(screen.getByRole('combobox', { name: t('sortMode') }).className).toContain('w-[132px]');
  });
});

describe('Toolbar — 回收站 removed in V2-D', () => {
  it('renders no trash action, even when trash-shaped props are passed', () => {
    renderToolbar({ hasTrash: true, onViewTrash: vi.fn() });

    expect(screen.queryByRole('button', { name: new RegExp(t('trash')) })).toBeNull();
  });
});

describe('BatchToolbar (V2-D — bottom-docked bar)', () => {
  const batch = (props = {}) => {
    const handlers = {
      onBatchMove: vi.fn(),
      onBatchOpenWindow: vi.fn(),
      onBatchTrash: vi.fn(),
      onClearSelections: vi.fn()
    };
    const utils = render(<BatchToolbar selectedCount={2} {...handlers} {...props} />);
    return { ...utils, handlers };
  };

  it('docks at the bottom with the design classes', () => {
    const { container } = batch();
    const bar = container.firstChild;

    expect(bar.className).toContain('shrink-0');
    expect(bar.className).toContain('border-t');
    expect(bar.className).toContain('bg-card');
    expect(bar.className).toContain('px-[22px]');
    expect(bar.className).toContain('py-2');
    expect(bar.querySelector(':scope > div').className).toContain('flex');
    expect(bar.querySelector(':scope > div').className).toContain('items-center');
    expect(bar.querySelector(':scope > div').className).toContain('gap-2');
  });

  it('renders the selected count with N in a mono, tabular, primary-coloured span', () => {
    batch({ selectedCount: 5 });
    const n = screen.getByText('5');

    expect(n.tagName).toBe('SPAN');
    expect(n.className).toContain('font-mono');
    expect(n.className).toContain('tabular-nums');
    expect(n.className).toContain('text-primary');
  });

  it('renders all five controls: move, open-window, delete, clear (plus the separator)', () => {
    const { container } = batch();

    expect(screen.getByRole('button', { name: t('batchMove') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('batchOpenWindow') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('delete') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('clearSelection') })).toBeInTheDocument();
    expect(screen.queryByText('添加标签')).toBeNull();
    expect(container.querySelector('[data-orientation="vertical"]')).toBeInTheDocument();
  });

  it('still routes its four actions', () => {
    const { handlers } = batch();

    fireEvent.click(screen.getByRole('button', { name: t('batchMove') }));
    fireEvent.click(screen.getByRole('button', { name: t('batchOpenWindow') }));
    fireEvent.click(screen.getByRole('button', { name: t('delete') }));
    fireEvent.click(screen.getByRole('button', { name: t('clearSelection') }));

    expect(handlers.onBatchMove).toHaveBeenCalledTimes(1);
    expect(handlers.onBatchOpenWindow).toHaveBeenCalledTimes(1);
    expect(handlers.onBatchTrash).toHaveBeenCalledTimes(1);
    expect(handlers.onClearSelections).toHaveBeenCalledTimes(1);
  });

  it('still disables move, open-window and delete with nothing selected, but not clear', () => {
    batch({ selectedCount: 0 });

    expect(screen.getByRole('button', { name: t('batchMove') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('batchOpenWindow') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('delete') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('clearSelection') })).not.toBeDisabled();
  });

  it('uses the solid shadcn destructive variant and outline for move/open-window', () => {
    batch();
    const del = screen.getByRole('button', { name: t('delete') });
    const move = screen.getByRole('button', { name: t('batchMove') });

    expect(del.className).toContain('bg-destructive');
    expect(del.className).toContain('text-destructive-foreground');
    expect(move.className).toContain('border');
  });

  it('gives the clear-selection button the ghost variant and muted text', () => {
    batch();
    const clear = screen.getByRole('button', { name: t('clearSelection') });

    expect(clear.className).toContain('text-muted-foreground');
  });

  it('carries no inline style', () => {
    const { container } = batch();

    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});
