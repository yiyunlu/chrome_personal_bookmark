import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { t } from '../lib/i18n';
import { Button } from './ui/button';

/* ─────────────────────────────────────────────────────────────────────────────
   Undo toast — HTML Popover top layer (UX-P0-UNDO-Z).

   Smoke 7: delete → S → click Undo while Save Tabs stays open.

   A plain `position:fixed` chip on `document.body` (even at max z-index, even
   re-appended after the dialog portal) still lost to Save Tabs in Chrome: Radix
   Dialog portals + RemoveScroll/`pointer-events: none` on <body> leave the chip
   covered or inert under the scrim. Sonner's list had the same paint fight once
   the dialog opened.

   `popover="manual"` + `showPopover()` puts this node in the browser top layer,
   which paints above ordinary fixed portals (DialogShell is a div portal, not a
   modal <dialog>). Re-calling showPopover is unnecessary while open; we only
   show while `undoToast` is set and hide when it clears. `elevate` re-asserts
   the top-layer entry if a modal opens after the chip (no-op when already open).

   `aria-live` on this same node keeps hideOthers from marking Undo.
   `data-sonner-toaster` keeps DialogShell's outside-click guard.
   `pointer-events: auto` restores hits while body is pointer-inert.
   ──────────────────────────────────────────────────────────────────────────── */

const TOAST_STYLE = {
  position: 'fixed',
  right: '1rem',
  bottom: '1rem',
  left: 'auto',
  top: 'auto',
  margin: 0,
  padding: 0,
  border: 'none',
  background: 'transparent',
  overflow: 'visible',
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

function isPopoverOpen(el) {
  try {
    return typeof el.matches === 'function' && el.matches(':popover-open');
  } catch {
    return false;
  }
}

function showLayer(el) {
  if (!el || typeof el.showPopover !== 'function') return;
  if (isPopoverOpen(el)) return;
  try {
    el.showPopover();
  } catch {
    // Already open or popover unsupported in this environment.
  }
}

function hideLayer(el) {
  if (!el || typeof el.hidePopover !== 'function') return;
  if (!isPopoverOpen(el)) return;
  try {
    el.hidePopover();
  } catch {
    // Already closed.
  }
}

/**
 * @param undoToast the `useUndoStack` state object, or null
 * @param onUndo     invoked by the Undo button
 * @param theme      resolved theme from `useTheme` (kept for API parity)
 * @param elevate    true while any modal is open — re-assert top-layer stacking
 */
export function UndoToast({ undoToast, onUndo, theme = 'system', elevate = false }) {
  const onUndoRef = useRef(onUndo);
  const layerRef = useRef(null);

  useLayoutEffect(() => {
    onUndoRef.current = onUndo;
  }, [onUndo]);

  useLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return undefined;

    if (undoToast) {
      showLayer(el);
    } else {
      hideLayer(el);
    }
    return undefined;
  }, [undoToast, elevate]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={layerRef}
      popover="manual"
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
