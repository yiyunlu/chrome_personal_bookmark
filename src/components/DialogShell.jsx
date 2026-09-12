import React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../lib/cn';
import { AlertDialog, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle } from './ui/alert-dialog';
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from './ui/dialog';

/* ─────────────────────────────────────────────────────────────────────────────
   Shared shells over the vendored shadcn Dialog / AlertDialog primitives.

   These replace the three hand-rolled overlays that existed before P1 (the
   107-line `Modal.jsx` focus trap plus ConfirmModal's and PromptModal's own
   full-viewport backdrops). Radix now owns the focus trap, the Tab cycle, the
   Escape handling, focus restore and the portal.

   `DialogShell` keeps `Modal`'s exact prop shape ({ open, onClose, title,
   className, children }) so none of its six callers — and therefore not
   `main.jsx` — had to change.

   Why the Radix `Content` primitive instead of shadcn's `DialogContent`:
   `DialogContent` hardcodes `p-6`/`gap-4` and renders a second close button,
   while all eight surfaces here are full-bleed (header / body / footer with
   their own dividers) and already provide their own close button. Everything
   else — Root, Portal, Overlay, Title, Description — comes from
   `src/components/ui/*`, which is untouched.
   ──────────────────────────────────────────────────────────────────────────── */

/** Dialogs sit above ChatPanel / ContextMenu (z-50) and UndoToast (z-80). */
export const LAYER_BASE = 'z-[90]';
/** For dialogs that can be opened from inside another dialog (confirm, prompt). */
export const LAYER_TOP = 'z-[100]';

/* `bg-slate-900/40` is the old overlay's rgba(15, 23, 42, 0.4), replacing
   shadcn's much darker bg-black/80.

   `data-[state=closed]:!animate-none` removes shadcn's exit animation. The
   previous implementations returned `null` the instant `open` went false, and
   every caller guards its body on the same state object (`{editorState && …}`),
   so a fade-out would animate an empty panel — and Radix's `Presence` keeps the
   backdrop mounted, pointer-events and all, for as long as its animation runs.
   The `!` is load-bearing: shadcn's `data-[state=closed]:animate-out` has the
   same specificity and is emitted later in the stylesheet. */
const OVERLAY_CLASS = 'bg-slate-900/40 data-[state=closed]:!animate-none';

/* Same panel as before: 1rem gutters, rounded-2xl, one border, project shadow.
   Enter animation classes are shadcn's — they are written to compose with the
   translate-based centering, which the project's `animate-slide-up` keyframe
   would clobber. No exit animation, see above. */
const PANEL_CLASS =
  'fixed left-1/2 top-1/2 w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 ' +
  'overflow-hidden rounded-2xl border duration-200 focus:outline-none ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 ' +
  'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]';

const PANEL_STYLE = {
  background: 'var(--panel-bg)',
  borderColor: 'var(--panel-border)',
  boxShadow: 'var(--shadow)'
};

/**
 * `useKeyboardShortcuts` also listens for Escape, on `window`, and its
 * `onEscape` closes whatever panel or menu sits behind the dialog. The old
 * `Modal` stopped the event at document level for exactly that reason; Radix
 * does not, so we reproduce it. Radix's own handler runs first (document,
 * capture phase, highest layer only) and still dismisses this layer, because
 * `stopPropagation` does not set `defaultPrevented`.
 */
function stopEscapePropagation(event) {
  event.stopPropagation();
}

/**
 * Radix restores focus to its `Trigger` on close. These dialogs are opened from
 * application state rather than from a `DialogTrigger`, so `triggerRef` is null
 * and Radix's handler — which calls `preventDefault()`, suppressing
 * `FocusScope`'s own restore — would drop focus on the floor. The old `Modal`
 * captured `document.activeElement` on open and refocused it on close; this
 * reproduces that. `onOpenAutoFocus` fires before Radix moves focus into the
 * panel, so it still sees the opener.
 */
function useReturnFocus() {
  const previousFocusRef = React.useRef(null);

  const onOpenAutoFocus = React.useCallback(() => {
    previousFocusRef.current = document.activeElement;
  }, []);

  const onCloseAutoFocus = React.useCallback((event) => {
    event.preventDefault();
    const previous = previousFocusRef.current;
    previousFocusRef.current = null;
    if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
      previous.focus();
    }
  }, []);

  return { onOpenAutoFocus, onCloseAutoFocus };
}

/**
 * Radix dismisses a modal Dialog on any pointer-down outside its content, and it
 * defers the decision to a document-level `click`. The undo toast lives outside
 * the dialog's portal (deliberately — see UndoToast.jsx), so it is "outside" by
 * Radix's reckoning and is not a registered dismissable branch. Without this,
 * clicking Undo while a dialog is open runs the undo AND closes the dialog:
 * delete a card, press `S`, click Undo, and SaveTabsModal's tab selection is
 * gone. Invisible to jsdom, which dispatches no pointerdown for fireEvent.click.
 */
const TOAST_ROOT_SELECTOR = '[data-sonner-toaster]';

function ignoreToastInteractions(event) {
  const target = event.target;
  if (target instanceof Element && target.closest(TOAST_ROOT_SELECTOR)) {
    event.preventDefault();
  }
}

/** Replacement for the old `Modal` — identical props. */
export function DialogShell({ open, onClose, title, className, children, layer = LAYER_BASE }) {
  const returnFocus = useReturnFocus();

  return (
    <Dialog
      open={!!open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <DialogPortal>
        <DialogOverlay className={cn(OVERLAY_CLASS, layer)} data-dialog-overlay="" />
        <DialogPrimitive.Content
          className={cn(PANEL_CLASS, layer, className || 'max-w-lg')}
          style={PANEL_STYLE}
          onEscapeKeyDown={stopEscapePropagation}
          onPointerDownOutside={ignoreToastInteractions}
          onInteractOutside={ignoreToastInteractions}
          onOpenAutoFocus={returnFocus.onOpenAutoFocus}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
        >
          {/* Accessible name, rendered sr-only. Every caller also renders its own
              visible heading inside `children`; that heading is a plain <h2>, so
              the dialog's name comes from here and the heading stays a heading.
              Do not "deduplicate" one surface without doing all nine. */}
          {title ? <DialogTitle className="sr-only">{title}</DialogTitle> : null}
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/**
 * Confirmation shell. AlertDialog deliberately refuses to dismiss on an
 * overlay click or an outside pointer-down; only Escape, Cancel or the action
 * close it.
 */
export function AlertDialogShell({ open, onClose, title, className, children, layer = LAYER_TOP }) {
  const returnFocus = useReturnFocus();

  return (
    <AlertDialog
      open={!!open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <AlertDialogPortal>
        <AlertDialogOverlay className={cn(OVERLAY_CLASS, layer)} data-dialog-overlay="" />
        <AlertDialogPrimitive.Content
          className={cn(PANEL_CLASS, layer, className || 'max-w-sm')}
          style={PANEL_STYLE}
          onEscapeKeyDown={stopEscapePropagation}
          onOpenAutoFocus={returnFocus.onOpenAutoFocus}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
        >
          {title ? <AlertDialogTitle className="sr-only">{title}</AlertDialogTitle> : null}
          {children}
        </AlertDialogPrimitive.Content>
      </AlertDialogPortal>
    </AlertDialog>
  );
}

/** Bare Cancel action: closes the AlertDialog and receives its initial focus. */
export const AlertDialogCancelAction = AlertDialogPrimitive.Cancel;
