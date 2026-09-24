import React, { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { t } from '../lib/i18n';
import { Button } from './ui/button';

/* ─────────────────────────────────────────────────────────────────────────────
   Undo toast (UX-P0-UNDO-Z).

   Smoke 7: delete → S → click Undo while Save Tabs stays open.

   Radix `DialogPortal` does `Children.map` + `Portal asChild` per child, so the
   in-dialog chip MUST be a `forwardRef` host element — a plain function component
   cannot receive the portal ref and never paints (a3f4a29 FAIL). Opening Save
   Tabs does not clear `undoToast`; the body chip was only hidden via `elevate`.
   ──────────────────────────────────────────────────────────────────────────── */

const TOAST_STYLE = {
  position: 'fixed',
  right: '1rem',
  bottom: '1rem',
  margin: 0,
  zIndex: 110,
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

/**
 * Portaled by DialogShell as a DialogPortal child. Must forwardRef: Radix Portal
 * uses asChild and merges onto this DOM node.
 */
export const DialogUndoChip = React.forwardRef(function DialogUndoChip(props, ref) {
  const view = useSyncExternalStore(subscribeUndoToastView, getUndoToastView, getUndoToastView);

  if (!view.undoToast) {
    // asChild still needs a real element; keep it out of hit-testing and layout.
    return (
      <div
        ref={ref}
        {...props}
        data-tabhub-undo-in-dialog=""
        aria-hidden="true"
        style={{ display: 'none' }}
      />
    );
  }

  return (
    <div
      ref={ref}
      {...props}
      role="status"
      aria-live="polite"
      data-sonner-toaster=""
      data-tabhub-undo-toast=""
      data-tabhub-undo-in-dialog=""
      data-theme={view.theme}
      style={{ ...(props.style || {}), ...TOAST_STYLE }}
    >
      <UndoToastBody
        message={view.undoToast.message}
        pending={!!view.undoToast.pending}
        onUndo={() => view.onUndo?.()}
      />
    </div>
  );
});

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
    return () => {
      publishView({ undoToast: null, onUndo: null, theme: 'system' });
    };
  }, [undoToast, theme]);

  if (typeof document === 'undefined') return null;
  // DialogShell paints the chip while a modal is open.
  if (elevate) return null;
  if (!undoToast) {
    return createPortal(
      <div
        role="status"
        aria-live="polite"
        data-sonner-toaster=""
        data-tabhub-undo-toast=""
        data-theme={theme}
        style={{ ...TOAST_STYLE, pointerEvents: 'none' }}
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
      style={TOAST_STYLE}
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
