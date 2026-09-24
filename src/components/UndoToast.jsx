import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { t } from '../lib/i18n';
import { Button } from './ui/button';

/* ─────────────────────────────────────────────────────────────────────────────
   Undo toast — compact body portal (UX-P0-UNDO-Z).

   Smoke 7: delete → S → click Undo while Save Tabs stays open.

   A full-viewport `inset:0` host at max z-index still vanished under Save Tabs:
   Radix wraps the dialog in RemoveScroll, which locks body scroll; a fixed
   fullscreen layer interacted badly and the chip disappeared after S even though
   it was visible before. The chip is now a compact `position:fixed` node on
   `document.body` (no fullscreen wrapper). While a chip is up, a MutationObserver
   re-appends it after any late dialog portal so paint order stays above z-90.

   `aria-live` on this same node keeps hideOthers from marking Undo.
   `data-sonner-toaster` keeps DialogShell's outside-click guard.
   ──────────────────────────────────────────────────────────────────────────── */

const TOAST_STYLE = {
  position: 'fixed',
  right: '1rem',
  bottom: '1rem',
  margin: 0,
  zIndex: 2147483647,
  pointerEvents: 'auto'
};

function UndoToastBody({ message, pending, onUndo }) {
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-card-foreground shadow-panel">
      <span className="text-sm">{message}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onUndo}
        className="h-auto gap-1 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary [&_svg]:size-3"
      >
        <Undo2 />
        {pending ? t('undoing') : t('undo')}
      </Button>
    </div>
  );
}

function moveToBodyEnd(el) {
  if (el && el.parentNode === document.body && document.body.lastElementChild !== el) {
    document.body.appendChild(el);
  }
}

/**
 * @param undoToast the `useUndoStack` state object, or null
 * @param onUndo     invoked by the Undo button
 * @param theme      resolved theme from `useTheme` (kept for API parity)
 * @param elevate    true while any modal is open — re-assert body-end stacking
 */
export function UndoToast({ undoToast, onUndo, theme = 'system', elevate = false }) {
  const onUndoRef = useRef(onUndo);
  const layerRef = useRef(null);

  useLayoutEffect(() => {
    onUndoRef.current = onUndo;
  }, [onUndo]);

  // Keep the chip after Radix dialog portals that mount later (Save Tabs).
  useLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return undefined;

    moveToBodyEnd(el);
    if (!undoToast && !elevate) return undefined;

    const observer = new MutationObserver(() => {
      moveToBodyEnd(el);
    });
    observer.observe(document.body, { childList: true });
    return () => observer.disconnect();
  }, [undoToast, elevate]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={layerRef}
      role="status"
      aria-live="polite"
      data-sonner-toaster=""
      data-tabhub-undo-toast=""
      data-theme={theme}
      style={TOAST_STYLE}
    >
      {undoToast ? (
        <UndoToastBody
          message={undoToast.message}
          pending={!!undoToast.pending}
          onUndo={() => onUndoRef.current?.()}
        />
      ) : null}
    </div>,
    document.body
  );
}
