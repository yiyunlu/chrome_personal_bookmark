import React from 'react';
import { t } from '../lib/i18n';
import { AlertDialogCancelAction, AlertDialogShell } from './DialogShell';
import { AlertDialogDescription, AlertDialogTitle } from './ui/alert-dialog';

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
        <AlertDialogTitle className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </AlertDialogTitle>
      </div>

      {/* Body */}
      <div className="px-5 py-3">
        <AlertDialogDescription className="text-sm" style={{ color: 'var(--muted)' }}>
          {message}
        </AlertDialogDescription>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-5 py-3.5 border-t" style={{ borderColor: 'var(--panel-border)' }}>
        <AlertDialogCancelAction
          type="button"
          className="px-3.5 py-1.5 rounded-lg border text-sm"
          style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
        >
          {cancelLabel || t('cancel')}
        </AlertDialogCancelAction>
        <button
          type="button"
          onClick={onConfirm}
          className="px-3.5 py-1.5 rounded-lg text-sm font-medium"
          style={
            danger
              ? { background: 'var(--danger)', color: '#fff' }
              : { background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }
          }
        >
          {confirmLabel || t('confirm')}
        </button>
      </div>
    </AlertDialogShell>
  );
}
