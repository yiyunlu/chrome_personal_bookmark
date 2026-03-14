import React from 'react';
import { FolderPen, Pencil, Trash2 } from 'lucide-react';

export function ContextMenu({ contextMenu, onEditCard, onDeleteCard, onRenameCollection, onDeleteCollection }) {
  if (!contextMenu) return null;

  return (
    <div
      className="fixed z-50 min-w-[10rem] rounded-xl border p-1 animate-slide-up"
      style={{
        top: contextMenu.y,
        left: contextMenu.x,
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        boxShadow: 'var(--shadow)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.kind === 'card' && (
        <>
          <button
            type="button"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onClick={onEditCard}
          >
            <Pencil size={14} style={{ color: 'var(--muted)' }} />
            编辑书签
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onClick={onDeleteCard}
          >
            <Trash2 size={14} />
            删除到回收站
          </button>
        </>
      )}
      {contextMenu.kind === 'collection' && (
        <>
          <button
            type="button"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onClick={onRenameCollection}
          >
            <FolderPen size={14} style={{ color: 'var(--muted)' }} />
            重命名目录
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 text-left rounded-lg px-2.5 py-2 text-sm hover:opacity-80"
            style={{ color: 'var(--danger)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onClick={onDeleteCollection}
          >
            <Trash2 size={14} />
            删除目录
          </button>
        </>
      )}
    </div>
  );
}
