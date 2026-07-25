import { useEffect } from 'react';

export function useKeyboardShortcuts({
  searchInputRef,
  onSaveTabs,
  onAutoOrganize,
  onToggleManage,
  autoOrganizing,
  disabled = false,
  onEscape
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      // Escape works everywhere, including inside inputs and while overlays are open.
      if (event.key === 'Escape') {
        if (onEscape) onEscape();
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
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [autoOrganizing, searchInputRef, onSaveTabs, onAutoOrganize, onToggleManage, disabled, onEscape]);
}
