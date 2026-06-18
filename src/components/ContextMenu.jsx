import React, { useCallback, useEffect, useRef } from 'react';
import { ExternalLink, FolderPen, Pencil, Trash2 } from 'lucide-react';
import { t } from '../lib/i18n';

export function ContextMenu({ contextMenu, onOpenNewTab, onEditCard, onDeleteCard, onRenameCollection, onDeleteCollection, onClose }) {
  const menuRef = useRef(null);

  // Focus the first menu item when opened
  useEffect(() => {
    if (!contextMenu) return;
    const raf = requestAnimationFrame(() => {
      const first = menuRef.current?.querySelector('[role="menuitem"]');
      if (first) first.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [contextMenu]);

  const handleKeyDown = useCallback(
    (e) => {
      const items = menuRef.current ? Array.from(menuRef.current.querySelectorAll('[role="menuitem"]')) : [];
      const currentIndex = items.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[next]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prev]?.focus();
          break;
        }
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
          break;
        case 'Tab':
          // Prevent tab from leaving the menu; close it instead
          e.preventDefault();
          onClose?.();
          break;
        default:
          break;
      }
    },
    [onClose]
  );

  if (!contextMenu) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[10rem] rounded-xl border p-1 animate-slide-up"
      style={{
        top: contextMenu.y,
        left: contextMenu.x,
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        boxShadow: 'var(--shadow)'
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {contextMenu.kind === 'card' && (
        <>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={onOpenNewTab}
          >
            <ExternalLink size={14} style={{ color: 'var(--muted)' }} />
            {t('openInNewTab')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={onEditCard}
          >
            <Pencil size={14} style={{ color: 'var(--muted)' }} />
            {t('editBookmark')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--danger-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--danger-soft)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={onDeleteCard}
          >
            <Trash2 size={14} />
            {t('deleteToTrash')}
          </button>
        </>
      )}
      {contextMenu.kind === 'collection' && (
        <>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={onRenameCollection}
          >
            <FolderPen size={14} style={{ color: 'var(--muted)' }} />
            {t('renameFolder')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--danger-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--danger-soft)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={onDeleteCollection}
          >
            <Trash2 size={14} />
            {t('deleteFolder')}
          </button>
        </>
      )}
    </div>
  );
}
