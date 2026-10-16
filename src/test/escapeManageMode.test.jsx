import React, { useCallback, useRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Toolbar } from '../components/Toolbar';
import { t } from '../lib/i18n';

/**
 * Mirrors main.jsx handleEscape overlay priority + manage-mode exit (UI-OPT-2).
 * Keeps the test aligned with App behavior without mounting the full tree.
 */
function EscapeHarness({ initialManageMode = false, initialPaletteOpen = false }) {
  const searchInputRef = useRef(null);
  const [manageMode, setManageMode] = useState(initialManageMode);
  const [paletteOpen, setPaletteOpen] = useState(initialPaletteOpen);

  const handleEscape = useCallback(() => {
    if (paletteOpen) {
      setPaletteOpen(false);
    } else if (manageMode) {
      setManageMode(false);
    }
  }, [paletteOpen, manageMode]);

  useKeyboardShortcuts({
    searchInputRef,
    onSaveTabs: vi.fn(),
    onAutoOrganize: vi.fn(),
    onToggleManage: vi.fn(),
    autoOrganizing: false,
    onEscape: handleEscape
  });

  return (
    <div>
      <span data-testid="manage">{manageMode ? 'on' : 'off'}</span>
      <span data-testid="palette">{paletteOpen ? 'open' : 'closed'}</span>
    </div>
  );
}

describe('Escape — exit manage mode (UI-OPT-2)', () => {
  it('sets manageMode false when no overlay is open', () => {
    render(<EscapeHarness initialManageMode />);
    expect(screen.getByTestId('manage')).toHaveTextContent('on');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('manage')).toHaveTextContent('off');
  });

  it('closes a higher-priority overlay before exiting manage mode', () => {
    render(<EscapeHarness initialManageMode initialPaletteOpen />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('palette')).toHaveTextContent('closed');
    expect(screen.getByTestId('manage')).toHaveTextContent('on');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('manage')).toHaveTextContent('off');
  });

  it('is a no-op when not in manage mode and no overlay', () => {
    render(<EscapeHarness />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('manage')).toHaveTextContent('off');
  });
});

/* B4 — real Toolbar (so the real Radix Select) + the real hook. Radix's
   DismissableLayer preventDefaults Esc without stopping propagation, so the
   window listener must honour `defaultPrevented`. */
function ToolbarEscapeHost() {
  const searchInputRef = useRef(null);
  const [manageMode, setManageMode] = useState(true);
  const handleEscape = useCallback(() => {
    if (manageMode) setManageMode(false);
  }, [manageMode]);

  useKeyboardShortcuts({
    searchInputRef,
    onSaveTabs: vi.fn(),
    onAutoOrganize: vi.fn(),
    onToggleManage: vi.fn(),
    autoOrganizing: false,
    onEscape: handleEscape
  });

  return (
    <div>
      <span data-testid="manage">{manageMode ? 'on' : 'off'}</span>
      <Toolbar
        activeSource={null}
        activeSourceId="src-1"
        tabHubRootId="root-1"
        manageMode={manageMode}
        autoOrganizing={false}
        search=""
        searchInputRef={searchInputRef}
        onSaveTabs={vi.fn()}
        onToggleManage={vi.fn()}
        onAutoOrganize={vi.fn()}
        onAICategorize={vi.fn()}
        onCheckDeadLinks={vi.fn()}
        onNewCollection={vi.fn()}
        onSearchChange={vi.fn()}
        sortMode="manual"
        onSortChange={vi.fn()}
      />
    </div>
  );
}

describe('Escape inside a Radix Select (B4)', () => {
  it('closes the Select but stays in manage mode; a second Escape exits', () => {
    render(<ToolbarEscapeHost />);
    const trigger = screen.getByRole('combobox', { name: t('sortMode') });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);

    fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByTestId('manage')).toHaveTextContent('on');

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('manage')).toHaveTextContent('off');
  });
});
