import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, HelpCircle, Trash2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DialogShell } from './DialogShell';

/* P6b — this surface is on token classes: no inline colours, every control is a
   <Button>, no icon size outside {11,12,13,16,20}. (Gate 12 greps text and cannot
   see comments, so the raw element this file no longer contains is not named
   here.) Three things are not obvious:

   · An icon's `size` prop is inert inside a <Button>: the cva's `[&_svg]:size-4`
     is a class and beats the svg's width/height attributes. So the 12px glyph in
     the 28px row button comes from `[&_svg]:size-3` on the Button, while the 32px
     header button keeps the cva's 16px. Outside a Button the prop still works.
   · Radix tooltips portal to <body>, outside this dialog's portal, so they sit
     behind DialogShell's z-90 panel at shadcn's stock z-50. `z-[110]` clears it —
     the same fix AICategorizeModal documents.
   · The scroll region is `max-h-[60vh] overflow-y-auto`, which is what the inline
     maxHeight / overflowY style did. It must stay on the body div: the header and
     footer are deliberately outside it. */

/* Icon-only affordances carry the label twice: as `aria-label` (a Radix tooltip
   only ever *describes* its trigger, so it is not an accessible name) and as the
   tooltip text. */
function IconTooltip({ label, children }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="z-[110]">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DeadLinkModal({ deadLinkState, onDeleteBookmark, onClose }) {
  const open = !!deadLinkState;
  const { loading, progress, results, error } = deadLinkState || {};
  const deadLinks = (results || []).filter((r) => r.linkStatus === 'dead');
  const unknownLinks = (results || []).filter((r) => r.linkStatus === 'unknown');
  const aliveCount = (results || []).filter((r) => r.alive).length;
  const hasProblems = deadLinks.length > 0 || unknownLinks.length > 0;

  return (
    <DialogShell open={open} onClose={onClose} title={t('deadLinkTitle')} className="max-w-xl">
      {deadLinkState && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-destructive" />
              <h2 className="text-base font-semibold text-foreground">{t('deadLinkTitle')}</h2>
            </div>
            <IconTooltip label={t('close')}>
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
            </IconTooltip>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  {t('deadLinkChecking')} {progress ? t('deadLinkProgress', progress.checked, progress.total) : ''}
                </span>
                {progress && (
                  <div className="h-1.5 w-full max-w-xs rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(progress.checked / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ) : error ? (
              <div className="py-6 text-center">
                <div className="text-sm text-destructive">{error}</div>
              </div>
            ) : !hasProblems ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle size={20} className="text-primary" />
                <div className="text-sm font-medium text-foreground">{t('deadLinkAllGood')}</div>
                <div className="text-xs text-muted-foreground">{t('deadLinkAllGoodDetail', aliveCount)}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  {t('deadLinkFound', deadLinks.length + unknownLinks.length, (results || []).length)}
                </div>

                {/* Confirmed dead links */}
                {deadLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <AlertTriangle size={12} />
                      {t('deadLinkConfirmed')} ({deadLinks.length})
                    </div>
                    {deadLinks.map((item) => (
                      <DeadLinkItem key={item.bookmarkId} item={item} variant="dead" onDelete={onDeleteBookmark} />
                    ))}
                  </div>
                )}

                {/* Unknown / unverifiable links */}
                {unknownLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                      <HelpCircle size={12} />
                      {t('deadLinkUnknown')} ({unknownLinks.length})
                    </div>
                    {unknownLinks.map((item) => (
                      <DeadLinkItem key={item.bookmarkId} item={item} variant="unknown" onDelete={onDeleteBookmark} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-border px-5 py-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t('close')}
            </Button>
          </div>
        </>
      )}
    </DialogShell>
  );
}

function DeadLinkItem({ item, variant, onDelete }) {
  const isDead = variant === 'dead';
  /* One class for the marker icon and the error line, as the old `iconColor`
     variable was: destructive for a confirmed dead link, warning for one that
     could not be verified. */
  const toneClass = isDead ? 'text-destructive' : 'text-warning';
  const Icon = isDead ? AlertTriangle : HelpCircle;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      {/* 16px: the contract's default, because this glyph pairs with a 14px title.
          Outside a Button, so the `size` prop is the right knob. */}
      <Icon size={16} className={cn('mt-0.5 flex-shrink-0', toneClass)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
        <div className="mt-0.5 flex items-center gap-1 truncate font-mono text-xs text-faint">
          <ExternalLink size={12} className="flex-shrink-0" />
          <span className="truncate">{item.url}</span>
        </div>
        {item.error && <div className={cn('mt-0.5 text-xs', toneClass)}>{item.error}</div>}
      </div>
      <IconTooltip label={t('deadLinkDeleteTitle')}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive [&_svg]:size-3"
          aria-label={t('deadLinkDeleteTitle')}
          onClick={() => onDelete(item.bookmarkId, item.title)}
        >
          <Trash2 />
        </Button>
      </IconTooltip>
    </div>
  );
}
