import React, { useCallback, useRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

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
