import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { t } from '../lib/i18n';
import { Button } from './ui/button';
import { Toaster } from './ui/sonner';

/* ─────────────────────────────────────────────────────────────────────────────
   The undo toast, on Sonner (P4), portaled to a stable body host.

   Why Sonner: a modal Radix Dialog sets `pointer-events: none` on <body> and
   `aria-hidden` on siblings; Sonner's always-mounted `aria-live` section is
   exempt from hideOthers, and we restore hit-testing via TOASTER_STYLE.

   Why a stable body host: App's root uses `position: relative` (stacking
   context), so an in-tree toaster with z-index 999999999 still paints under
   DialogShell portals on `document.body` (z-90). A dedicated host appended
   once to `document.body` keeps the toaster above Save Tabs (smoke item 7).
   Host is created synchronously so the Toaster never remounts (a remount
   would drop an in-flight toast.custom).
   ──────────────────────────────────────────────────────────────────────────── */

const TOASTER_STYLE = { pointerEvents: 'auto', zIndex: 2147483647 };

const TOAST_OPTIONS = { duration: Infinity, dismissible: false };

const HOST_ID = 'tabhub-undo-toaster-host';

function getToasterHost() {
  if (typeof document === 'undefined') return null;
  let node = document.getElementById(HOST_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = HOST_ID;
    document.body.appendChild(node);
  }
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
 * @param theme      resolved theme from `useTheme`
 */
export function UndoToast({ undoToast, onUndo, theme = 'system' }) {
  const onUndoRef = useRef(onUndo);
  const shownIdRef = useRef(null);
  const host = getToasterHost();

  useEffect(() => {
    onUndoRef.current = onUndo;
  }, [onUndo]);

  const id = undoToast?.id ?? null;
  const message = undoToast?.message ?? '';
  const pending = !!undoToast?.pending;

  useEffect(() => {
    const shown = shownIdRef.current;
    if (id === null) {
      if (shown !== null) {
        sonnerToast.dismiss(shown);
        shownIdRef.current = null;
      }
      return;
    }
    if (shown !== null && shown !== id) sonnerToast.dismiss(shown);
    shownIdRef.current = id;
    sonnerToast.custom(
      () => <UndoToastBody message={message} pending={pending} onUndo={() => onUndoRef.current?.()} />,
      { id, ...TOAST_OPTIONS }
    );
  }, [id, message, pending]);

  useEffect(
    () => () => {
      if (shownIdRef.current !== null) {
        sonnerToast.dismiss(shownIdRef.current);
        shownIdRef.current = null;
      }
    },
    []
  );

  if (!host) return null;

  return createPortal(
    <Toaster theme={theme} position="bottom-right" offset={16} style={TOASTER_STYLE} />,
    host
  );
}
