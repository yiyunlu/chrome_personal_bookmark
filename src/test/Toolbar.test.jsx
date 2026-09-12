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

  it('gives the selected option the accent-soft treatment and the other the muted one', () => {
    renderToolbar({ view: 'list', onViewChange: vi.fn() });

    expect(viewButton('listView').className).toContain('bg-accent');
    expect(viewButton('listView').className).toContain('text-primary');
    expect(viewButton('gridView').className).toContain('text-muted-foreground');
    expect(viewButton('gridView').className).not.toContain('bg-accent');
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

  it('still gives manage mode the accent-soft active treatment and the exit label', () => {
    renderToolbar({ manageMode: true });
    const button = screen.getByRole('button', { name: new RegExp(t('exitManageMode')) });

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('bg-primary/10');
    expect(button.className).toContain('border-primary');
    expect(button.className).toContain('text-primary');
    // The base surface must actually be gone, not merely listed earlier.
    expect(button.className).not.toContain('bg-card');
    expect(button.className).not.toContain('border-border');
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

  it('carries no inline style anywhere in the header', () => {
    const { container } = renderToolbar({
      manageMode: true,
      deadLinkCount: 2,
      view: 'list',
      onViewChange: vi.fn(),
      activeSource: { id: 's1', title: 'Bar', isTabHub: false }
    });

    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});

describe('BatchToolbar', () => {
  const batch = (props = {}) => {
    const handlers = {
      onBatchMove: vi.fn(),
      onBatchTrash: vi.fn(),
      onClearSelections: vi.fn()
    };
    const utils = render(<BatchToolbar selectedCount={2} {...handlers} {...props} />);
    return { ...utils, handlers };
  };

  it('still routes its three actions', () => {
    const { handlers } = batch();

    fireEvent.click(screen.getByRole('button', { name: t('batchMove') }));
    fireEvent.click(screen.getByRole('button', { name: t('delete') }));
    fireEvent.click(screen.getByRole('button', { name: t('clearSelection') }));

    expect(handlers.onBatchMove).toHaveBeenCalledTimes(1);
    expect(handlers.onBatchTrash).toHaveBeenCalledTimes(1);
    expect(handlers.onClearSelections).toHaveBeenCalledTimes(1);
  });

  it('still disables move and delete with nothing selected, but not clear', () => {
    batch({ selectedCount: 0 });

    expect(screen.getByRole('button', { name: t('batchMove') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('delete') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('clearSelection') })).not.toBeDisabled();
  });

  it('keeps the soft destructive fill on delete rather than shadcn’s solid one', () => {
    batch();
    const del = screen.getByRole('button', { name: t('delete') });

    expect(del.className).toContain('bg-destructive/10');
    expect(del.className).toContain('text-destructive');
    // The ghost variant's own hover must not repaint it.
    expect(del.className).not.toContain('hover:bg-accent');
  });

  it('carries no inline style', () => {
    const { container } = batch();

    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});
