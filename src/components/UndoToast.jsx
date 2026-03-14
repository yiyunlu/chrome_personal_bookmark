import React from 'react';
import { Undo2 } from 'lucide-react';

export function UndoToast({ undoToast, onUndo }) {
  if (!undoToast) return null;

  return (
    <div
      className="fixed right-4 bottom-4 z-[80] flex items-center gap-3 rounded-xl border px-4 py-2.5 animate-slide-in-right"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        boxShadow: 'var(--shadow)',
        color: 'var(--text)'
      }}
    >
      <span className="text-sm">{undoToast.message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        <Undo2 size={12} />
        {undoToast.pending ? '撤销中…' : '撤销'}
      </button>
    </div>
  );
}
