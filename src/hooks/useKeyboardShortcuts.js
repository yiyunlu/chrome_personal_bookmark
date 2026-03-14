import { useEffect } from 'react';

export function useKeyboardShortcuts({ searchInputRef, onSaveTabs, onAutoOrganize, onToggleManage, autoOrganizing }) {
  useEffect(() => {
    const onKeyDown = (event) => {
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
  }, [autoOrganizing, searchInputRef, onSaveTabs, onAutoOrganize, onToggleManage]);
}
