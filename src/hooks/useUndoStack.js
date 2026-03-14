import { useEffect, useRef, useState } from 'react';

export function useUndoStack() {
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    },
    []
  );

  const showUndo = (message, undo) => {
    const id = Date.now();
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoToast({ id, message, undo, pending: false });
    undoTimerRef.current = setTimeout(() => {
      setUndoToast((prev) => (prev?.id === id ? null : prev));
      undoTimerRef.current = null;
    }, 8000);
  };

  const handleUndo = async (onAfterUndo) => {
    if (!undoToast || undoToast.pending) return;
    const action = undoToast;
    setUndoToast((prev) => (prev ? { ...prev, pending: true } : prev));
    try {
      await action.undo();
      if (onAfterUndo) await onAfterUndo();
    } finally {
      setUndoToast(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    }
  };

  return { undoToast, showUndo, handleUndo };
}
