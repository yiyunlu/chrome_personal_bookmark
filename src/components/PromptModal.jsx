import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../lib/i18n';

export function PromptModal({
  open,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  confirmLabel,
  onConfirm,
  onCancel
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  // Reset value when modal opens with a new defaultValue
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  // Auto-focus the input when modal opens
  useEffect(() => {
    if (open) {
      // Use a short timeout so the DOM is rendered before focusing
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      } else if (e.key === 'Enter' && value.trim()) {
        onConfirm?.(value.trim());
      }
    },
    [onCancel, onConfirm, value]
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
        <div className="px-5 pt-5 pb-1">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 py-3 space-y-3">
          {message && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {message}
            </p>
          )}
          <input
            ref={inputRef}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
            value={value}
            placeholder={placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border text-sm"
            style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => value.trim() && onConfirm?.(value.trim())}
            disabled={!value.trim()}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
          >
            {confirmLabel || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
