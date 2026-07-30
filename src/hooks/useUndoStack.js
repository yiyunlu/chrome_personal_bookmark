import { useCallback, useEffect, useRef, useState } from 'react';

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

  // Stable identity matters: showUndo sits in effect dependency arrays (e.g. the
  // card SortableJS setup in main.jsx), so recreating it per render would tear
  // down and rebuild those effects on every state update.
  const showUndo = useCallback((message, undo) => {
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
  }, []);

  const handleUndo = useCallback(
    async (onAfterUndo) => {
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
    },
    [undoToast]
  );

  return { undoToast, showUndo, handleUndo };
}
