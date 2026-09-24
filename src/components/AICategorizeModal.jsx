import React from 'react';
import { Check, FolderOpen, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { DialogShell } from './DialogShell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/* ── Token classes (P6a) ──────────────────────────────────────────────────────
   No inline `var()` left: `--panel-border` → `border-border`, `--panel-bg` →
   `bg-card`, `--text` → `text-foreground`, `--muted` → `text-muted-foreground`,
   `--danger` → `text-destructive`, `--accent` / `--accent-soft` → `primary` and
   `bg-primary/10`. Geometry is the contract's Spacing row and Typography table.

   Nothing this file composes carries a responsive-prefixed class: `Button`,
   `Tooltip` and the raw Radix `Content` inside `DialogShell` have none, and the
   `sm:*` set lives on shadcn's `DialogContent` / `DialogHeader` / `DialogFooter`,
   which `DialogShell` deliberately does not use. So mechanism D has nothing to
   bite here — checked, not assumed. */
const HEADER_CLASS = 'flex items-center justify-between border-b border-border px-5 py-4';
const TITLE_CLASS = 'text-base font-semibold text-foreground';
const CLOSE_BUTTON_CLASS = 'h-7 w-7 text-muted-foreground';
const BODY_CLASS = 'max-h-[60vh] overflow-y-auto p-5';
const FOOTER_CLASS = 'flex items-center justify-between gap-2 border-t border-border px-5 py-4';
/* A suggestion row is a bordered row inside a dialog, not a card surface, so it
   takes the control radius rather than `Card`'s `rounded-xl`. */
const ROW_CLASS = 'flex items-start gap-3 rounded-md border border-border px-3 py-2.5';
/* Accept / reject: icon-only ghost buttons. The glyph size comes from the cva's
   `[&_svg]:size-4` (16px) — inside a Button a `size` prop is inert, since the
   class beats the svg's width/height attributes. */
const ROW_ACTION_CLASS = 'h-7 w-7';
/* The soft-accent chip, shared by the "new collection" tags and the accepted
   badge. `rounded-sm` is the scale's dense-affordance value; plain `rounded` is
   4px and off-scale. */
const CHIP_CLASS = 'rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs text-primary';

/* The accept / reject buttons are icon-only, so the label has to be the
   button's `aria-label` (a Radix tooltip only ever *describes* its trigger) as
   well as the tooltip text. `z-[110]` because the tooltip is portalled to
   <body> while this dialog sits at DialogShell's z-90 — shadcn's stock
   `TooltipContent` is z-50 and would render behind the panel. No drag guard
   here: the only draggables are the bookmark cards behind this dialog's scrim,
   which cannot be dragged while it is open. */
function ActionTooltip({ label, children }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="z-[110]">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AICategorizeModal({ aiState, onAcceptSuggestion, onRejectSuggestion, onApplyAll, onClose }) {
  const open = !!aiState;
  const { loading, suggestions, newCollections, error } = aiState || {};
  const pending = (suggestions || []).filter((s) => s.status === 'pending');
  const accepted = (suggestions || []).filter((s) => s.status === 'accepted');

  return (
    <DialogShell open={open} onClose={onClose} title={t('aiCategorizeTitle')} className="max-w-xl">
      {aiState && (
        <>
          {/* Header */}
          <div className={HEADER_CLASS}>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <h2 className={TITLE_CLASS}>{t('aiCategorizeTitle')}</h2>
            </div>
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
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">{t('aiAnalyzing')}</span>
              </div>
            ) : error ? (
              <div className="py-6 text-center">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-sm text-muted-foreground">{t('aiNoSuggestions')}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {newCollections.length > 0 && (
                  <div className="mb-2 text-xs text-muted-foreground">
                    {t('aiSuggestNewCollections')}
                    {newCollections.map((name) => (
                      <span key={name} className={cn(CHIP_CLASS, 'ml-1 inline-block')}>
                        {name}
                      </span>
                    ))}
                  </div>
                )}

                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      ROW_CLASS,
                      suggestion.status === 'rejected' ? 'bg-transparent opacity-40' : 'bg-card'
                    )}
                  >
                    <FolderOpen size={16} className="mt-0.5 flex-shrink-0 text-primary/70" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{suggestion.bookmarkTitle}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        → {suggestion.targetCollectionTitle}
                        <span className="ml-2">{suggestion.reason}</span>
                      </div>
                    </div>
                    {suggestion.status === 'pending' && (
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <ActionTooltip label={t('aiAccept')}>
                          <Button
                            variant="ghost"
                            size="icon"
                            // hover:text-primary is not decoration: ghost ships hover:text-accent-foreground,
                            // which is a different merge group from text-primary, so both survive and
                            // the glyph goes near-black under the pointer. See mechanism E.
                            className={cn(ROW_ACTION_CLASS, 'text-primary hover:text-primary')}
                            onClick={() => onAcceptSuggestion(idx)}
                            aria-label={t('aiAccept')}
                          >
                            <Check />
                          </Button>
                        </ActionTooltip>
                        <ActionTooltip label={t('aiReject')}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(ROW_ACTION_CLASS, 'text-muted-foreground')}
                            onClick={() => onRejectSuggestion(idx)}
                            aria-label={t('aiReject')}
                          >
                            <X />
                          </Button>
                        </ActionTooltip>
                      </div>
                    )}
                    {suggestion.status === 'accepted' && (
                      <span className={cn(CHIP_CLASS, 'flex-shrink-0')}>{t('aiAccepted')}</span>
                    )}
                    {suggestion.status === 'rejected' && (
                      <span className="flex-shrink-0 text-xs text-muted-foreground">{t('aiRejected')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && suggestions.length > 0 && (
            <div className={FOOTER_CLASS}>
              <span className="text-xs text-muted-foreground">{t('aiSummary', accepted.length, pending.length)}</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t('cancel')}
                </Button>
                <Button type="button" onClick={onApplyAll} disabled={accepted.length === 0}>
                  {t('aiApply', accepted.length)}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </DialogShell>
  );
}
