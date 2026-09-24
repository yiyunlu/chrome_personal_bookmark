import React, { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { t } from '../lib/i18n';
import { Button } from './ui/button';

/* ─────────────────────────────────────────────────────────────────────────────
   Undo toast (UX-P0-UNDO-Z).

   Smoke 7: delete → S → click Undo while Save Tabs stays open.

   Body portals (max z-index, MutationObserver, popover top layer) and Radix
   DialogPortal-asChild hosts all failed in real Chrome: opening Save Tabs left
   the chip gone even though `undoToast` state stayed set. The reliable surface
   is *inside* DialogPrimitive.Content — same stacking context as the panel,
   `position:absolute` within the fixed panel (not a body sibling under the
   scrim). `DialogShell` renders that chip; `UndoToast` keeps the body chip only
   while no modal is open (`elevate`).
   ──────────────────────────────────────────────────────────────────────────── */

const BODY_TOAST_STYLE = {
  position: 'fixed',
  right: '1rem',
  bottom: '1rem',
  margin: 0,
  zIndex: 80,
  pointerEvents: 'auto'
};

/* Inside Content: panel is position:fixed + transformed, so absolute is relative
   to the panel box. Sit above the footer actions, clear of the close button. */
const PANEL_TOAST_STYLE = {
  position: 'absolute',
  right: '3rem',
  top: '0.75rem',
  margin: 0,
  zIndex: 20,
  pointerEvents: 'auto'
};

/** @type {{ undoToast: object|null, onUndo: Function|null, theme: string }} */
let viewState = { undoToast: null, onUndo: null, theme: 'system' };
const viewListeners = new Set();

function publishView(next) {
  viewState = next;
  viewListeners.forEach((listener) => listener());
}

export function subscribeUndoToastView(listener) {
  viewListeners.add(listener);
  return () => viewListeners.delete(listener);
}

export function getUndoToastView() {
  return viewState;
}

export function UndoToastBody({ message, pending, onUndo }) {
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

/** Rendered inside DialogPrimitive.Content (not portaled to body). */
export function DialogUndoChip() {
  const view = useSyncExternalStore(subscribeUndoToastView, getUndoToastView, getUndoToastView);
  if (!view.undoToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-sonner-toaster=""
      data-tabhub-undo-toast=""
      data-tabhub-undo-in-dialog=""
      data-theme={view.theme}
      style={PANEL_TOAST_STYLE}
    >
      <UndoToastBody
        message={view.undoToast.message}
        pending={!!view.undoToast.pending}
        onUndo={() => view.onUndo?.()}
      />
    </div>
  );
}

/**
 * @param undoToast the `useUndoStack` state object, or null
 * @param onUndo     invoked by the Undo button
 * @param theme      resolved theme from `useTheme`
 * @param elevate    true while any modal is open — body chip hides; DialogUndoChip shows
 */
export function UndoToast({ undoToast, onUndo, theme = 'system', elevate = false }) {
  const onUndoRef = useRef(onUndo);

  useLayoutEffect(() => {
    onUndoRef.current = onUndo;
  }, [onUndo]);

  useLayoutEffect(() => {
    publishView({
      undoToast,
      onUndo: () => onUndoRef.current?.(),
      theme
    });
  }, [undoToast, theme]);

  useLayoutEffect(() => {
    return () => {
      publishView({ undoToast: null, onUndo: null, theme: 'system' });
    };
  }, []);

  if (typeof document === 'undefined') return null;
  if (elevate) return null;
  if (!undoToast) {
    return createPortal(
      <div
        role="status"
        aria-live="polite"
        data-sonner-toaster=""
        data-tabhub-undo-toast=""
        data-theme={theme}
        style={{ ...BODY_TOAST_STYLE, pointerEvents: 'none' }}
      />,
      document.body
    );
  }

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-sonner-toaster=""
      data-tabhub-undo-toast=""
      data-theme={theme}
      style={BODY_TOAST_STYLE}
    >
      <UndoToastBody
        message={undoToast.message}
        pending={!!undoToast.pending}
        onUndo={() => onUndoRef.current?.()}
      />
    </div>,
    document.body
  );
}
