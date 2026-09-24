import React, { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { Button } from './ui/button';
import { DialogShell, LAYER_TOP } from './DialogShell';
import { DialogDescription, DialogTitle } from './ui/dialog';

/* P6b — on token classes. The field keeps the dialog look it had (its own height,
   the page-background fill, an accent focus ring at 2px) but its colours are
   tokens and its radius is now the Input's own `rounded-md`, the contract's
   control radius, instead of a `rounded-lg` override.

   `md:text-sm` is restated on purpose: shadcn's Input ships `text-base md:text-sm`
   and a responsive prefix is its own merge group, so an unprefixed `text-sm` only
   removes `text-base` and leaves `md:text-sm` alive above 768px. The two agree
   here, so nothing was visibly wrong — restating it means the size is stated once.

   The ring is `ring-2` + `ring-primary`, two different merge groups, not the
   arbitrary-colour-plus-opacity pair that silently resolved to the opacity alone
   and cost nine controls their accent ring in P3. */
const FIELD_CLASS = cn(
  'h-auto w-full bg-background px-3 py-2 shadow-none',
  'text-sm md:text-sm text-foreground',
  'focus-visible:ring-2 focus-visible:ring-primary'
);

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
        <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
      </div>

      {/* Body */}
      <div className="space-y-3 px-5 py-3">
        {message && <DialogDescription className="text-sm text-muted-foreground">{message}</DialogDescription>}
        <Input
          // The dialog's own title is the field's name: this modal has exactly
          // one control, and a visible <Label> would duplicate the heading.
          aria-label={typeof title === 'string' ? title : undefined}
          className={FIELD_CLASS}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={!value.trim()}>
          {confirmLabel || t('confirm')}
        </Button>
      </div>
    </DialogShell>
  );
}
