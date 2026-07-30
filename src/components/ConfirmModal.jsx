import React, { useCallback, useEffect } from 'react';
import { t } from '../lib/i18n';

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
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.4)' }}
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded-2xl border overflow-hidden animate-slide-up"
        style={{
          background: 'var(--panel-bg)',
          borderColor: 'var(--panel-border)',
          boxShadow: 'var(--shadow)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-1"
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-3">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border text-sm"
            style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
          >
            {cancelLabel || t('cancel')}
          </button>
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
      </div>
    </div>
  );
}
