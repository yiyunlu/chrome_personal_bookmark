import React, { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { DialogShell } from './DialogShell';
import { BookmarkIcon } from './BookmarkIcon';

const NEW_COLLECTION_VALUE = '__new__';

/* ── Token classes (P6a) ──────────────────────────────────────────────────────
   No inline `var()` anywhere: `--panel-border` → `border-border`, `--text` →
   `text-foreground`, `--muted` → `text-muted-foreground`, `--input-bg` →
   `bg-background`, `--accent` / `--btn-primary` → `primary`. Geometry follows
   the contract's Spacing row and its Typography table.

   `Input` and `SelectTrigger` keep their own `h-9 rounded-md px-3` (the radius
   table puts controls at `rounded-md`, so P3's `rounded-lg` override is gone).
   What is restated, and why each one is needed:
     · `bg-background` — the fields keep the well they had as `--input-bg`
       (the alias resolved to the --ui-background token); the primitives' own
       `bg-transparent` would flatten them into the panel's card white.
     · `shadow-none` — flat fields. `shadow` is registered as a custom scale in
       `src/lib/cn.js`, so it really displaces `shadow-sm`.
     · `focus-visible:ring-2` / `focus:ring-2` — width only; the colour stays the
       vendored `ring-ring`, which is the accent (`--ui-ring` == `--ui-primary`).
       `SelectTrigger` rings on `:focus`, `Input` on `:focus-visible`.
     · `md:text-sm` — `Input` ships `text-base md:text-sm`; an unprefixed
       `text-sm` leaves the prefixed one alive above 768px (mechanism D). Same
       value on both sides, so nothing moves, but the override is now total.
       `SelectTrigger` carries no responsive class, hence no prefix there. */
const HEADER_CLASS = 'flex items-center justify-between border-b border-border px-5 py-4';
const TITLE_CLASS = 'text-base font-semibold text-foreground';
const CLOSE_BUTTON_CLASS = 'h-7 w-7 text-muted-foreground';
const BODY_CLASS = 'space-y-3 p-5';
const FOOTER_CLASS = 'flex items-center justify-end gap-2 border-t border-border px-5 py-4';
const FIELD_CLASS = 'bg-background text-sm md:text-sm shadow-none focus-visible:ring-2';
const TRIGGER_CLASS = 'bg-background text-sm shadow-none focus:ring-2';
/* `leading-none` restated after `text-xs` — a later font size deletes an earlier
   line height (mechanism A) — and it is the value `Label` itself ships. */
const FIELD_LABEL_CLASS = 'mb-1 block text-xs font-medium leading-none text-muted-foreground';
/* Two overrides of the vendored SelectContent, neither of which needs the file
   edited (cn() is twMerge, and the viewport override outranks the vendored class
   on specificity):
   - z-[110]: the listbox portals to document.body, *outside* the dialog's
     portal, so shadcn's z-50 would put it behind the z-[90] dialog panel.
   - the viewport override: shadcn pins the popper viewport to
     its own --radix-select-trigger-height, i.e. one row tall with the rest
     scrolled out of sight. The Viewport takes no className from callers. */
const CONTENT_CLASS = 'z-[110] max-h-72 [&_[data-radix-select-viewport]]:h-auto';
/* The checklist is a control-sized surface inside a dialog → `rounded-md`. */
const LIST_BOX_CLASS = 'max-h-64 overflow-y-auto rounded-md border border-border bg-background p-1';

export function SaveTabsModal({ open, tabs, defaultFolderName, collections, onSave, onClose }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set((tabs || []).map((tab) => tab.id)));
  const [folderName, setFolderName] = useState(defaultFolderName || '');
  const [targetId, setTargetId] = useState(NEW_COLLECTION_VALUE);
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens with new tabs
  React.useEffect(() => {
    if (tabs && tabs.length > 0) {
      setSelectedIds(new Set(tabs.map((tab) => tab.id)));
      setFolderName(defaultFolderName || '');
      setTargetId(NEW_COLLECTION_VALUE);
    }
  }, [tabs, defaultFolderName]);

  const allSelected = useMemo(
    () => tabs && tabs.length > 0 && selectedIds.size === tabs.length,
    [tabs, selectedIds]
  );

  const toggleAll = useCallback(() => {
    if (!tabs) return;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tabs.map((tab) => tab.id)));
    }
  }, [tabs, allSelected]);

  const toggleTab = useCallback((tabId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  }, []);

  const getDomain = useCallback((url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saving || selectedIds.size === 0) return;
    setSaving(true);
    try {
      await onSave({
        selectedTabIds: selectedIds,
        folderName,
        targetCollectionId: targetId === NEW_COLLECTION_VALUE ? null : targetId
      });
    } finally {
      setSaving(false);
    }
  }, [saving, selectedIds, folderName, targetId, onSave]);

  if (!open || !tabs) return null;

  return (
    <DialogShell open={open} onClose={onClose} title={t('saveTabsTitle')} className="max-w-xl">
      {/* Header */}
      <div className={HEADER_CLASS}>
        <h2 className={TITLE_CLASS}>{t('saveTabsTitle')}</h2>
        <Button
          variant="ghost"
          size="icon"
          className={CLOSE_BUTTON_CLASS}
          aria-label={t('close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      {/* Body */}
      <div className={BODY_CLASS}>
        {/* Folder name */}
        <div>
          <Label htmlFor="tabhub-save-folder" className={FIELD_LABEL_CLASS}>
            {t('folderName')}
          </Label>
          <Input
            id="tabhub-save-folder"
            className={FIELD_CLASS}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder={t('folderName')}
          />
        </div>

        {/* Target collection */}
        <div>
          <Label htmlFor="tabhub-save-target" className={FIELD_LABEL_CLASS}>
            {t('targetCollection')}
          </Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger id="tabhub-save-target" aria-label={t('targetCollection')} className={TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={CONTENT_CLASS}>
              <SelectItem value={NEW_COLLECTION_VALUE}>{t('newCollectionOption')}</SelectItem>
              {(collections || []).map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Select all / Deselect all + count */}
        <div className="flex items-center justify-between">
          {/* `secondary` is the soft-surface variant, which is exactly what the
              old `--accent-soft` chip was; `text-primary` supplies the accent
              label on top of it, after the cva's own foreground colour. */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs text-primary shadow-none"
            onClick={toggleAll}
          >
            {allSelected ? t('deselectAll') : t('selectAll')}
          </Button>
          <span className="text-xs text-muted-foreground">{t('tabsSelected', selectedIds.size)}</span>
        </div>

        {/* Tab checklist */}
        <div className={LIST_BOX_CLASS}>
          {tabs.map((tab) => (
            <Label
              key={tab.id}
              // `font-normal` undoes shadcn's Label default: this one wraps a
              // whole row, and font-medium would inherit into the tab title
              // below. `leading-none` is restated after `text-sm` (mechanism A)
              // for the same reason every other Label override here does.
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-normal leading-none',
                selectedIds.has(tab.id) ? 'bg-accent' : 'bg-transparent hover:bg-accent/60'
              )}
            >
              {/* A plain checkbox: shadcn's Input is a text field (h-9, w-full,
                  border) and `checkbox` is a separate primitive, not vendored.
                  `accent-primary` is the token form of accentColor. */}
              <input
                type="checkbox"
                checked={selectedIds.has(tab.id)}
                onChange={() => toggleTab(tab.id)}
                className="rounded accent-primary"
              />
              <BookmarkIcon url={tab.url} title={tab.title} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-foreground">{tab.title}</div>
                <div className="truncate text-xs text-muted-foreground">{getDomain(tab.url)}</div>
              </div>
            </Label>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={FOOTER_CLASS}>
        <Button type="button" variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || selectedIds.size === 0}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
    </DialogShell>
  );
}
