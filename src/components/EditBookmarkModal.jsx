import React, { useCallback } from 'react';
import { FolderOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { DialogShell } from './DialogShell';

/* ── Token classes (P6a) ──────────────────────────────────────────────────────
   Every colour here is a token class, not an inline `var()`: `--panel-border` is
   `border-border`, `--text` is `text-foreground`, `--muted` is
   `text-muted-foreground`, `--input-bg` is `bg-background`, `--accent` is
   `primary`. Geometry is the contract's Spacing row (header/footer `px-5 py-4`,
   body `p-5`) and its Typography table (dialog title `text-base font-semibold`).

   The fields keep `Input`'s own `h-9 rounded-md px-3` — the radius table says
   controls are `rounded-md`, so the old `rounded-lg` override is gone. Four
   things are restated on top of it:
     · `bg-background` — the old `--input-bg` alias resolved to the
       --ui-background token, so this is the colour the fields already had;
       `Input`'s own `bg-transparent` would flatten them into the panel's white.
     · `shadow-none` — the design's fields are flat. `shadow` is a custom scale
       registered in `src/lib/cn.js`, so this really does displace `shadow-sm`.
     · `focus-visible:ring-2` — width only. The colour stays the vendored
       `focus-visible:ring-ring`, which *is* the accent (`--ui-ring` and
       `--ui-primary` are the same triplet); naming the accent again as an
       arbitrary ring colour would buy nothing and re-open the P3 ring trap.
     · `md:text-sm` — `Input` ships `text-base md:text-sm`. An unprefixed
       `text-sm` deletes only `text-base` and leaves the prefixed class alive to
       win from 768px up (mechanism D). Same 14px on both sides here, so nothing
       moves — but the override is total instead of accidentally correct. */
const HEADER_CLASS = 'flex items-center justify-between border-b border-border px-5 py-4';
const TITLE_CLASS = 'text-base font-semibold text-foreground';
const CLOSE_BUTTON_CLASS = 'h-7 w-7 text-muted-foreground';
const BODY_CLASS = 'space-y-3 p-5';
const FOOTER_CLASS = 'flex items-center justify-end gap-2 border-t border-border px-5 py-4';
const FIELD_CLASS = 'bg-background text-sm md:text-sm shadow-none focus-visible:ring-2';
/* `leading-none` is restated after `text-xs` (mechanism A: a later font size
   deletes an earlier line height). The value is the one `Label` itself ships and
   the one `Sidebar.jsx` uses, so the P3-era `leading-normal` is gone from all
   four P6a surfaces: a one-line field label wants its box to be its cap height,
   which is what makes the `mb-1` gap below it the gap you actually see. */
const FIELD_LABEL_CLASS = 'mb-1 block text-xs font-medium leading-none text-muted-foreground';
/* The scroll box is a control-sized surface inside a dialog, so `rounded-md`. */
const LIST_BOX_CLASS = 'overflow-y-auto rounded-md border border-border bg-background p-1';
/* A dense affordance inside a dialog → `rounded-sm`, and `h-auto` in place of
   Button's `h-9` keeps the two-padding row it replaces. `[&_svg]:size-3` is how
   a 12px glyph is reached inside a Button: the cva's `[&_svg]:size-4` is a class
   and beats the svg's own width/height, so a `size` prop would be inert. */
const LIST_ROW_CLASS =
  'h-auto w-full justify-start gap-2 rounded-sm px-2.5 py-1.5 text-sm font-normal text-left [&_svg]:size-3';
/* Selected, not hovered: `bg-accent` is the hover surface, so a selection tinted
   with it is indistinguishable from the row under the pointer. The soft-primary
   pair is P5b's active-row idiom, restated for hover so it survives it. */
const LIST_ROW_SELECTED_CLASS = 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary';

export function EditBookmarkModal({ editorState, setEditorState, filteredTargets, onSave, onClose }) {
  const saving = !!editorState?.saving;

  // Enter submits from the two text fields, like PromptModal. Not wired on the
  // folder filter below it: that field only narrows the list, and the target is
  // chosen by clicking a row.
  const handleFieldKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!saving) onSave?.();
      }
    },
    [onSave, saving]
  );

  return (
    <DialogShell open={!!editorState} onClose={onClose} title={t('editBookmark')}>
      {editorState && (
        <>
          {/* Header */}
          <div className={HEADER_CLASS}>
            <h2 className={TITLE_CLASS}>{t('editBookmark')}</h2>
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
            <div>
              <Label htmlFor="tabhub-edit-title" className={FIELD_LABEL_CLASS}>
                {t('titleLabel')}
              </Label>
              <Input
                id="tabhub-edit-title"
                className={FIELD_CLASS}
                value={editorState.title}
                onChange={(e) => setEditorState((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                onKeyDown={handleFieldKeyDown}
              />
            </div>
            <div>
              <Label htmlFor="tabhub-edit-url" className={FIELD_LABEL_CLASS}>
                URL
              </Label>
              <Input
                id="tabhub-edit-url"
                className={FIELD_CLASS}
                value={editorState.url}
                onChange={(e) => setEditorState((prev) => (prev ? { ...prev, url: e.target.value } : prev))}
                onKeyDown={handleFieldKeyDown}
              />
            </div>
            <div>
              <Label htmlFor="tabhub-edit-folder" className={FIELD_LABEL_CLASS}>
                {t('moveToFolder')}
              </Label>
              <Input
                id="tabhub-edit-folder"
                className={FIELD_CLASS}
                placeholder={t('searchFolder')}
                value={editorState.folderQuery}
                onChange={(e) => setEditorState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))}
              />
              <div className={cn(LIST_BOX_CLASS, 'mt-2 max-h-48')}>
                {filteredTargets.map((collection) => (
                  <Button
                    type="button"
                    key={collection.id}
                    variant="ghost"
                    className={cn(
                      LIST_ROW_CLASS,
                      editorState.targetParentId === collection.id && LIST_ROW_SELECTED_CLASS
                    )}
                    onClick={() => setEditorState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))}
                  >
                    <FolderOpen className="opacity-60" />
                    <span className="truncate">{collection.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={FOOTER_CLASS}>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="button" onClick={onSave} disabled={editorState.saving}>
              {editorState.saving ? t('saving') : t('save')}
            </Button>
          </div>
        </>
      )}
    </DialogShell>
  );
}
