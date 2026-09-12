import React, { useEffect, useRef } from 'react';
import { Undo2 } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { t } from '../lib/i18n';
import { Toaster } from './ui/sonner';

/* ─────────────────────────────────────────────────────────────────────────────
   The undo toast, on Sonner (P4).

   Why it moved off a plain `fixed` div: P1 raised the dialogs to z-90/z-100 to
   clear ChatPanel (z-50) and this toast (z-80), and a modal Radix Dialog does
   two more things while it is open —

     · DismissableLayer's `disableOutsidePointerEvents` sets
       `pointer-events: none` on <body>. The property inherits, so a toast
       rendered anywhere under <body> stops being hit-testable: the Undo button
       silently ignores clicks.
     · `hideOthers(content)` (aria-hidden) walks <body>'s children and marks
       everything that is not an ancestor of the dialog with `aria-hidden`,
       which takes the toast away from screen readers too.

   A z-index bump fixes neither. Two properties of Sonner's Toaster do:

     · its container is `position: fixed; z-index: 999999999` (its own injected
       stylesheet), so it is never under a dialog scrim; and
     · it always renders a `<section aria-live="polite">`, even with zero
       toasts. `aria-hidden`'s hideOthers explicitly exempts `[aria-live]`
       elements (node_modules/aria-hidden/dist/es2015/index.js: `targets.push(
       …querySelectorAll('[aria-live], script'))`), so that section — and
       everything inside it — is skipped, and so are its ancestors. Because the
       Toaster is mounted for the lifetime of the app rather than only while a
       toast is up, the exemption is in place *before* any dialog opens, which
       is what the old conditionally-rendered toast could not guarantee.

   Pointer events still have to be restored explicitly; see TOASTER_STYLE.

   Timing is *not* owned here. `useUndoStack` starts and clears the 8s window
   (src/hooks/useUndoStack.js) and this component is a pure projection of its
   `undoToast` state onto Sonner's store: one toast per `undoToast.id`, updated
   in place while `pending` flips, dismissed when the state goes back to null.
   ──────────────────────────────────────────────────────────────────────────── */

/* Re-enables hit testing for the toast list and its children while a modal
   dialog holds `pointer-events: none` on <body> — the same escape hatch Radix
   uses for its own content. Sonner spreads `style` onto the toast <ol>. */
const TOASTER_STYLE = { pointerEvents: 'auto' };

/* `duration: Infinity` because useUndoStack owns the clock; a second timer in
   Sonner could only disagree with it. `dismissible: false` keeps the old
   behaviour that the toast is dismissed by Undo or by the timeout, never by a
   swipe. */
const TOAST_OPTIONS = { duration: Infinity, dismissible: false };

/** The panel itself — same geometry, colours and copy as the pre-P4 toast. */
function UndoToastBody({ message, pending, onUndo }) {
  return (
    <div
      className="pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-2.5"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        boxShadow: 'var(--shadow)',
        color: 'var(--text)'
      }}
    >
      <span className="text-sm">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        <Undo2 size={12} />
        {pending ? t('undoing') : t('undo')}
      </button>
    </div>
  );
}

/**
 * @param undoToast the `useUndoStack` state object, or null
 * @param onUndo     invoked by the Undo button
 * @param theme      resolved theme from `useTheme` — Sonner's own theming,
 *                   which shadcn normally wires to `next-themes`
 */
export function UndoToast({ undoToast, onUndo, theme = 'system' }) {
  const onUndoRef = useRef(onUndo);
  const shownIdRef = useRef(null);

  // The callback identity changes every App render; keeping it in a ref means
  // that does not re-publish (and so re-animate) the toast.
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
    // showUndo() replaces an unexpired toast with a new id; the old one has no
    // duration of its own, so it has to be taken down explicitly.
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

  // Mounted unconditionally: that is what keeps the aria-live region present
  // (and therefore exempt from hideOthers) before a dialog ever opens.
  // `offset` reproduces the old `bottom-4 right-4`.
  return <Toaster theme={theme} position="bottom-right" offset={16} style={TOASTER_STYLE} />;
}
