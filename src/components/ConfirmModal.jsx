import React from 'react';
import { t } from '../lib/i18n';
import { Button } from './ui/button';
import { AlertDialogCancelAction, AlertDialogShell } from './DialogShell';
import { AlertDialogDescription, AlertDialogTitle } from './ui/alert-dialog';

/* P6b — on token classes. Two deliberate choices:

   · Cancel stays `AlertDialogCancelAction` (the bare Radix `Cancel`) with a
     `Button` slotted in through `asChild`, rather than shadcn's styled
     `AlertDialogCancel`. That one ships `mt-2 sm:mt-0` for the stacked footer it
     assumes, and `sm:mt-0` is its own merge group — an unprefixed `mt-0` would not
     remove it, so it would take a prefixed override to cancel a margin this footer
     never wanted. Radix still owns the element: it closes the dialog and receives
     the AlertDialog's initial focus, which is what `dialog.test.jsx` asserts.
   · The confirm action is the `destructive` variant when `danger` is set and the
     `default` variant otherwise — the contract's two rows for "the one primary
     action of a surface" and "a confirmed destructive action". `#fff` is gone with
     it: `destructive-foreground` is the token for text on that surface. */

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel
}) {
  return (
    <AlertDialogShell open={open} onClose={onCancel}>
      {/* Header */}
      <div className="px-5 pt-5 pb-1">
        <AlertDialogTitle className="text-base font-semibold text-foreground">{title}</AlertDialogTitle>
      </div>

      {/* Body */}
      <div className="px-5 py-3">
        <AlertDialogDescription className="text-sm text-muted-foreground">{message}</AlertDialogDescription>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <AlertDialogCancelAction asChild>
          <Button type="button" variant="outline" size="sm">
            {cancelLabel || t('cancel')}
          </Button>
        </AlertDialogCancelAction>
        <Button type="button" size="sm" variant={danger ? 'destructive' : 'default'} onClick={onConfirm}>
          {confirmLabel || t('confirm')}
        </Button>
      </div>
    </AlertDialogShell>
  );
}
