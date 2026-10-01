import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DialogShell } from './DialogShell';

/* P6b — on token classes. Two merge hazards are handled here, both verified by
   resolving the real string through cn() rather than by reading it:

   · `md:text-sm` is restated. shadcn's Input ships `text-base md:text-sm`, and a
     responsive prefix is its own merge group, so an unprefixed `text-sm` removes
     `text-base` and leaves `md:text-sm` alive to win from 768px up. Here the two
     happen to agree, so the leftover is harmless — it is restated anyway so the
     field's size is stated once and cannot drift.
   · The selected target row restates its hover pair. `hover:*` is its own merge
     group too, so the ghost variant's `hover:bg-accent hover:text-accent-foreground`
     survives an unprefixed `bg-primary/10 text-primary` and would repaint the
     selected row on hover. `hover:bg-primary/10 hover:text-primary` displaces it.

   The field keeps its own height (`h-auto px-3 py-2`) rather than the Input's h-9,
   and its radius now comes from the Input's own `rounded-md` — the contract's
   control radius — instead of the old `rounded-lg` override. */
const FIELD_CLASS = cn(
  'h-auto w-full bg-background px-3 py-2 shadow-none',
  'text-sm md:text-sm text-foreground',
  'focus-visible:ring-2 focus-visible:ring-primary'
);

/* One target row: 30px, `rounded-sm` (a dense affordance inside a dialog), and a
   12px glyph, which has to be a class because the Button cva's `[&_svg]:size-4`
   beats an svg width/height attribute. */
const TARGET_ROW_CLASS = 'h-[30px] w-full justify-start gap-2 rounded-sm px-2.5 text-sm font-normal [&_svg]:size-3';
const TARGET_ROW_SELECTED_CLASS = 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary';

export function BatchMoveModal({ batchMoveState, setBatchMoveState, filteredTargets, selectedCount, onSave, onClose }) {
  return (
    <DialogShell open={!!batchMoveState} onClose={onClose} title={t('batchMoveTitle', selectedCount)}>
      {batchMoveState && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-base font-semibold text-foreground">{t('batchMoveTitle', selectedCount)}</h2>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={t('close')}
                    onClick={onClose}
                  >
                    <X />
                  </Button>
                </TooltipTrigger>
                {/* Portalled to <body>, so z-[110] to clear DialogShell's z-90 panel. */}
                <TooltipContent className="z-[110]">{t('close')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <Label htmlFor="tabhub-batch-folder" className="mb-1 block text-xs leading-normal text-muted-foreground">
              {t('selectTargetFolder')}
            </Label>
            <Input
              id="tabhub-batch-folder"
              className={FIELD_CLASS}
              placeholder={t('searchFolder')}
              value={batchMoveState.folderQuery}
              onChange={(e) => setBatchMoveState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))}
            />
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-background p-1">
              {filteredTargets.map((collection) => {
                const selected = batchMoveState.targetParentId === collection.id;
                return (
                  <Button
                    type="button"
                    key={collection.id}
                    variant="ghost"
                    size="sm"
                    className={cn(TARGET_ROW_CLASS, selected ? TARGET_ROW_SELECTED_CLASS : 'text-foreground')}
                    aria-pressed={selected}
                    onClick={() =>
                      setBatchMoveState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))
                    }
                  >
                    <FolderOpen className="opacity-60" />
                    <span className="truncate">{collection.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={batchMoveState.moving || !batchMoveState.targetParentId || selectedCount === 0}
            >
              {batchMoveState.moving ? t('moving') : t('batchMove')}
            </Button>
          </div>
        </>
      )}
    </DialogShell>
  );
}
