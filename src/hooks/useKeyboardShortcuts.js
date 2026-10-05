import { useEffect } from 'react';

export function useKeyboardShortcuts({
  searchInputRef,
  onSaveTabs,
  onAutoOrganize,
  onToggleManage,
  autoOrganizing,
  disabled = false,
  onEscape,
  onTogglePalette,
  onCapture
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      // Escape works everywhere, including inside inputs and while overlays are open.
      if (event.key === 'Escape') {
        if (onEscape) onEscape();
        return;
      }

      // Cmd/Ctrl+K toggles the command palette. Handled before the chord guard
      // below and deliberately NOT gated on `disabled` or on the typing check:
      // the palette itself is a "modal" (so `disabled` is true while it is open)
      // and its own input is where the second press has to close it. Whether it
      // may open (no other overlay up) is the callback's call, not the hook's.
      if (
        onTogglePalette &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        onTogglePalette();
        return;
      }

      // Never hijack browser/system chords (Cmd+S save-page, Cmd+M minimize, Ctrl+O …).
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Single-key shortcuts are surprising while a modal is open.
      if (disabled) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        const typing = tag === 'input' || tag === 'textarea' || target.isContentEditable;
        if (typing) return;
        // An open dropdown menu (the capture split button's) owns the keyboard:
        // Radix typeahead there must not also fire a global action.
        if (target.closest('[role="menu"]')) return;
      }

      const key = event.key.toLowerCase();
      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      } else if (key === 's') {
        event.preventDefault();
        onSaveTabs();
      } else if (key === 'o') {
        event.preventDefault();
        if (!autoOrganizing) {
          onAutoOrganize();
        }
      } else if (key === 'm') {
        event.preventDefault();
        onToggleManage();
      } else if (key === 'c' && onCapture) {
        // One-click capture. A held key must not re-fire it (each press creates a collection).
        event.preventDefault();
        if (!event.repeat) onCapture();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [autoOrganizing, searchInputRef, onSaveTabs, onAutoOrganize, onToggleManage, disabled, onEscape, onTogglePalette, onCapture]);
}
