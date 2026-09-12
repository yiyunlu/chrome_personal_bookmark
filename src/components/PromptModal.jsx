import React, { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { t } from '../lib/i18n';
import { DialogShell, LAYER_TOP } from './DialogShell';
import { DialogDescription, DialogTitle } from './ui/dialog';

// shadcn's Input is h-9/rounded-md/shadow-sm/text-base; this keeps the dialog
// field look (rounded-lg, 14px, accent focus ring).
const FIELD_CLASS =
  'h-auto w-full rounded-lg px-3 py-2 text-sm shadow-none ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-opacity-30';

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

  // Reset value when modal opens with a new defaultValue
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const submit = useCallback(() => {
    if (value.trim()) onConfirm?.(value.trim());
  }, [onConfirm, value]);

  // Radix autofocuses the first tabbable element — the input — and selects its
  // text, which is what the old hand-rolled setTimeout(focus + select) did.
  // Escape is handled by the dialog; only Enter needs wiring.
  const handleInputKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return (
    <DialogShell open={open} onClose={onCancel} className="max-w-sm" layer={LAYER_TOP}>
      {/* Header */}
      <div className="px-5 pt-5 pb-1">
        <DialogTitle className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </DialogTitle>
      </div>

      {/* Body */}
      <div className="px-5 py-3 space-y-3">
        {message && (
          <DialogDescription className="text-sm" style={{ color: 'var(--muted)' }}>
            {message}
          </DialogDescription>
        )}
        <Input
          // The dialog's own title is the field's name: this modal has exactly
          // one control, and a visible <Label> would duplicate the heading.
          aria-label={typeof title === 'string' ? title : undefined}
          className={FIELD_CLASS}
          style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
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
          onClick={submit}
          disabled={!value.trim()}
          className="px-3.5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
        >
          {confirmLabel || t('confirm')}
        </button>
      </div>
    </DialogShell>
  );
}
