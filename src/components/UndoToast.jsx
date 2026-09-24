import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { t } from '../lib/i18n';
import { Button } from './ui/button';

/* ─────────────────────────────────────────────────────────────────────────────
   Undo toast — direct body portal (UX-P0-UNDO-Z).

   Why not Sonner's toast list for the visible chip: a modal Radix Dialog calls
   hideOthers(), which keeps `[aria-live]` nodes and their *ancestors*, but marks
   *siblings* aria-hidden. Sonner puts `aria-live` on an empty <section> beside
   the toast <ol>, so the real Undo chip is hidden from the a11y tree — and in
   practice the Save Tabs smoke (delete → S → click Undo) could not see or hit it
   above the dialog scrim.

   Fix: one always-mounted `aria-live` container that *wraps* the chip (so the
   button stays a descendant of the exempt node), portaled to document.body with
   a top stacking layer. `data-sonner-toaster` keeps DialogShell's outside-click
   guard (ignoreToastInteractions) working without renaming that contract.
   ──────────────────────────────────────────────────────────────────────────── */

const HOST_ID = 'tabhub-undo-toaster-host';

const HOST_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 2147483647,
  pointerEvents: 'none'
};

const TOAST_STYLE = {
  pointerEvents: 'auto',
  zIndex: 2147483647
};

function ensureToasterHost() {
  if (typeof document === 'undefined') return null;
  let node = document.getElementById(HOST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = HOST_ID;
    document.body.appendChild(node);
  }
  // Keep the layer after late-mounted dialog portals.
  if (document.body.lastElementChild !== node) {
    document.body.appendChild(node);
  }
  Object.assign(node.style, HOST_STYLE);
  return node;
}

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

/**
 * @param undoToast the `useUndoStack` state object, or null
 * @param onUndo     invoked by the Undo button
 * @param theme      resolved theme from `useTheme` (kept for API parity)
 */
export function UndoToast({ undoToast, onUndo, theme = 'system' }) {
  const onUndoRef = useRef(onUndo);
  const [host, setHost] = useState(null);

  useLayoutEffect(() => {
    setHost(ensureToasterHost());
  }, []);

  // Re-append above dialog portals whenever a chip is shown (Save Tabs opens later).
  useLayoutEffect(() => {
    if (undoToast) setHost(ensureToasterHost());
  }, [undoToast]);

  useLayoutEffect(() => {
    onUndoRef.current = onUndo;
  }, [onUndo]);

  if (!host) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-sonner-toaster=""
      data-tabhub-undo-toast=""
      data-theme={theme}
      className="fixed right-4 bottom-4"
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
    host
  );
}
