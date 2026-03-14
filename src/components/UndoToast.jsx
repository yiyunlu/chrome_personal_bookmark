import React from 'react';

export function UndoToast({ undoToast, onUndo }) {
  if (!undoToast) return null;

  return (
    <div className="undo-toast">
      <span>{undoToast.message}</span>
      <button type="button" className="undo-btn" onClick={onUndo}>
        {undoToast.pending ? 'Undoing...' : 'Undo'}
      </button>
    </div>
  );
}
