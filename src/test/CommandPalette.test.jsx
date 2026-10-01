import React, { useCallback, useRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { DismissableLayerBranch } from '@radix-ui/react-dismissable-layer';
import { CommandPalette } from '../components/CommandPalette';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { t } from '../lib/i18n';
import { tick } from './dialogHelpers';

/* FEAT-1 — ⌘K palette. Drives the real component through the real
   useKeyboardShortcuts hook (as forms.test.jsx does for `/`). */

const cards = [
  { id: 'b1', title: 'React Tutorial', url: 'https://react.dev/learn', collectionId: 'c1', collectionTitle: 'Dev' },
  { id: 'b2', title: 'Recipes', url: 'https://cooking.example.com', collectionId: 'c2', collectionTitle: 'Food' }
];
const collections = [
  { id: 'c1', title: 'Reading list', cards: [cards[0]] },
  { id: 'c2', title: 'Food', cards: [cards[1]] }
];
const tabs = [{ id: 11, title: 'React docs', url: 'https://react.dev/reference' }];

function Harness({ onSelect = vi.fn(), loadTabs = async () => tabs, onSaveTabs = vi.fn(), onManage = vi.fn(), initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const searchInputRef = useRef(null);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  useKeyboardShortcuts({
    searchInputRef,
    onSaveTabs,
    onAutoOrganize: vi.fn(),
    onToggleManage: onManage,
    autoOrganizing: false,
    disabled: open,
    onEscape: vi.fn(),
    onTogglePalette: toggle
  });
  return (
    <>
      <input ref={searchInputRef} aria-label="page search" />
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        cards={cards}
        collections={collections}
        loadTabs={loadTabs}
        onSelect={onSelect}
      />
    </>
  );
}

const ctrlK = (target = document.body) => fireEvent.keyDown(target, { key: 'k', ctrlKey: true });
const metaK = (target = document.body) => fireEvent.keyDown(target, { key: 'k', metaKey: true });

async function openPalette(props) {
  const utils = render(<Harness {...props} />);
  ctrlK();
  await tick();
  await tick();
  return utils;
}

const input = () => screen.getByRole('combobox');
const options = () => screen.getAllByRole('option');
const type = (value) => fireEvent.change(input(), { target: { value } });

describe('CommandPalette — open / close', () => {
  it('Ctrl+K and Cmd+K open it, and the input is focused', async () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
    ctrlK();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(input()).toHaveFocus();
    unmount();

    render(<Harness />);
    metaK();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('Ctrl+K again closes it, even with focus inside the input', async () => {
    await openPalette();
    ctrlK(input());
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc closes it', async () => {
    await openPalette();
    fireEvent.keyDown(input(), { key: 'Escape' });
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not open for plain k, or for Ctrl+Shift+K / Ctrl+Alt+K', async () => {
    render(<Harness />);
    fireEvent.keyDown(document.body, { key: 'k' });
    fireEvent.keyDown(document.body, { key: 'K', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true, altKey: true });
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('prevents the browser default for the chord', () => {
    render(<Harness />);
    const notPrevented = fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(notPrevented).toBe(false);
  });
});

describe('CommandPalette — results', () => {
  it('shows three labelled groups for a matching query', async () => {
    await openPalette();
    type('react');
    const groups = Array.from(document.querySelectorAll('[data-palette-group]')).map((g) => g.dataset.paletteGroup);
    expect(groups).toEqual(['bookmarks', 'tabs']);
    type('o'); // collection "Reading list" / "Food", bookmark, tab all fuzzy-hit
    expect(screen.getByText(t('cmdkGroupBookmarks'))).toBeInTheDocument();
    expect(screen.getByText(t('cmdkGroupCollections'))).toBeInTheDocument();
    expect(screen.getByText(t('cmdkGroupTabs'))).toBeInTheDocument();
  });

  it('lists collections and open tabs before anything is typed', async () => {
    await openPalette();
    expect(screen.getByText('Reading list')).toBeInTheDocument();
    expect(screen.getByText('React docs')).toBeInTheDocument();
    expect(screen.queryByText('React Tutorial')).toBeNull();
  });

  it('shows the hint when nothing matches', async () => {
    await openPalette();
    type('zzzqqq');
    expect(screen.getByText(t('cmdkEmptyTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('cmdkEmptyHint'))).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('survives loadTabs rejecting (bookmarks and collections still work)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await openPalette({ loadTabs: () => Promise.reject(new Error('no tabs api')) });
    type('react');
    expect(screen.getByText('React Tutorial')).toBeInTheDocument();
    warn.mockRestore();
  });
});

describe('CommandPalette — keyboard', () => {
  it('first row is selected; arrows move and wrap; aria-activedescendant follows', async () => {
    await openPalette();
    type('react'); // bookmark React Tutorial, tab React docs
    let opts = options();
    expect(opts).toHaveLength(2);
    expect(opts[0]).toHaveAttribute('aria-selected', 'true');
    expect(input()).toHaveAttribute('aria-activedescendant', opts[0].id);

    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    opts = options();
    expect(opts[1]).toHaveAttribute('aria-selected', 'true');
    expect(input()).toHaveAttribute('aria-activedescendant', opts[1].id);

    fireEvent.keyDown(input(), { key: 'ArrowDown' }); // wraps
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input(), { key: 'ArrowUp' }); // wraps back
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    expect(input()).toHaveFocus();
  });

  it('Enter selects the highlighted bookmark, closes, and reports it', async () => {
    const onSelect = vi.fn();
    await openPalette({ onSelect });
    type('react');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ type: 'bookmark', id: 'b1', url: 'https://react.dev/learn' });
    expect(onSelect.mock.calls[0][1]).toEqual({ newTab: false });
    await tick();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Enter after ArrowDown selects the tab row; Ctrl+Enter asks for a new tab', async () => {
    const onSelect = vi.fn();
    await openPalette({ onSelect });
    type('react');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'Enter', ctrlKey: true });
    expect(onSelect.mock.calls[0][0]).toMatchObject({ type: 'tab', id: 11 });
    expect(onSelect.mock.calls[0][1]).toEqual({ newTab: true });
  });

  it('Enter on a collection reports a collection item', async () => {
    const onSelect = vi.fn();
    await openPalette({ onSelect });
    type('reading');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onSelect.mock.calls[0][0]).toMatchObject({ type: 'collection', id: 'c1' });
  });

  it('Enter with no results does nothing and stays open', async () => {
    const onSelect = vi.fn();
    await openPalette({ onSelect });
    type('zzzqqq');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('ignores Enter / arrows while an IME composition is active', async () => {
    const onSelect = vi.fn();
    await openPalette({ onSelect });
    type('react');
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(input(), { key: 'ArrowDown', keyCode: 229 });
    expect(onSelect).not.toHaveBeenCalled();
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking a row selects it', async () => {
    const onSelect = vi.fn();
    await openPalette({ onSelect });
    type('react');
    fireEvent.click(options()[1]);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ type: 'tab', id: 11 });
  });

  it('hovering a row highlights it', async () => {
    await openPalette();
    type('react');
    fireEvent.mouseMove(options()[1]);
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
  });
});

describe('CommandPalette — no clash with other global shortcuts', () => {
  it('typing s / o / m / / in the input triggers none of them', async () => {
    const onSaveTabs = vi.fn();
    const onManage = vi.fn();
    await openPalette({ onSaveTabs, onManage });
    for (const key of ['s', 'o', 'm', '/']) {
      fireEvent.keyDown(input(), { key });
    }
    expect(onSaveTabs).not.toHaveBeenCalled();
    expect(onManage).not.toHaveBeenCalled();
    expect(input()).toHaveFocus();
  });

  it('S still opens Save Tabs when the palette is closed (existing key untouched)', () => {
    const onSaveTabs = vi.fn();
    render(<Harness onSaveTabs={onSaveTabs} />);
    fireEvent.keyDown(document.body, { key: 's' });
    expect(onSaveTabs).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+S / Cmd+M stay unhijacked', () => {
    const onSaveTabs = vi.fn();
    const onManage = vi.fn();
    render(<Harness onSaveTabs={onSaveTabs} onManage={onManage} />);
    fireEvent.keyDown(document.body, { key: 's', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'm', metaKey: true });
    expect(onSaveTabs).not.toHaveBeenCalled();
    expect(onManage).not.toHaveBeenCalled();
  });
});

describe('useKeyboardShortcuts — onTogglePalette', () => {
  function HookOnly({ onTogglePalette, disabled = false }) {
    useKeyboardShortcuts({
      searchInputRef: { current: null },
      onSaveTabs: vi.fn(),
      onAutoOrganize: vi.fn(),
      onToggleManage: vi.fn(),
      autoOrganizing: false,
      disabled,
      onEscape: vi.fn(),
      onTogglePalette
    });
    return <textarea aria-label="t" />;
  }

  it('fires from inside a text field and while `disabled` (so it can close itself)', () => {
    const toggle = vi.fn();
    render(<HookOnly onTogglePalette={toggle} disabled />);
    fireEvent.keyDown(screen.getByLabelText('t'), { key: 'k', ctrlKey: true });
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('is inert when no callback is supplied (old call sites unchanged)', () => {
    render(<HookOnly />);
    expect(fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true })).toBe(true);
  });
});

describe('CommandPalette — undo toast layering is not regressed', () => {
  it('clicking the toast outside the dialog does not dismiss the palette', async () => {
    render(
      <>
        <DismissableLayerBranch asChild>
          <section aria-live="polite" data-sonner-toaster="">
            <button type="button">Undo</button>
          </section>
        </DismissableLayerBranch>
        <Harness initialOpen />
      </>
    );
    await screen.findByRole('dialog');
    const undo = screen.getByRole('button', { name: 'Undo' });
    fireEvent.pointerDown(undo, { button: 0, pointerType: 'mouse' });
    fireEvent.click(undo, { button: 0 });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders on the shared dialog layer (z-90), below the toast top layer', async () => {
    await openPalette();
    const panel = within(document.body).getByRole('dialog');
    expect(panel.className).toMatch(/z-\[90\]/);
  });

  it('top-anchored geometry survives the merge (vertical centring displaced, not stacked)', async () => {
    await openPalette();
    const cls = within(document.body).getByRole('dialog').className.split(/\s+/);
    expect(cls).toContain('top-[18%]');
    expect(cls).toContain('translate-y-0');
    expect(cls).not.toContain('top-1/2');
    expect(cls).not.toContain('-translate-y-1/2');
    expect(cls).toContain('-translate-x-1/2');
  });
});
