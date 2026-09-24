import React from 'react';
import { Bookmark, FolderPlus, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { t } from '../lib/i18n';

/* P6c — the first-run card on token classes.

   The panel is a <Card>: rounded-xl, `border-border` and `bg-card` all come
   from the primitive, which is how the hand-rolled off-scale radius leaves. Card
   ships `shadow`; this surface never had one, so `shadow-none` keeps it flat
   like the collection panels P5a left flat.

   The three CTAs are Buttons, per the contract's variant table: the one primary
   action of the surface is `default` (filled with the accent, as the old inline
   --accent was) and the two secondary ones are `outline`. Their radius is now
   the control radius the Button cva ships rather than the old rounded-xl. */
const CTA_CLASS = 'h-auto w-full justify-start gap-3 px-4 py-3';

export function WelcomeCard({ onSaveTabs, onCreateCollection, onConnectAI, onDismiss }) {
  return (
    <Card className="mx-auto mt-12 max-w-lg p-8 shadow-none animate-fade-in">
      {/* Dismiss button */}
      <div className="-mr-4 -mt-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onDismiss}
          aria-label={t('welcomeDismiss')}
          title={t('welcomeDismiss')}
        >
          {/* No size prop: inside a Button the cva's [&_svg]:size-4 owns it. */}
          <X />
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6 text-center">
        {/* An illustration, not type: the contract's three type roles describe
            text, and this emoji is the surface's artwork. */}
        <div className="mb-3 text-4xl">📑</div>
        <h2 className="text-base font-semibold">{t('welcomeTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('welcomeMessage')}</p>
      </div>

      {/* CTA buttons */}
      <div className="space-y-3">
        <Button type="button" className={CTA_CLASS} onClick={onSaveTabs}>
          <Bookmark />
          <span>{t('welcomeSaveTabs')}</span>
        </Button>

        <Button type="button" variant="outline" className={CTA_CLASS} onClick={onCreateCollection}>
          <FolderPlus className="text-primary" />
          <span>{t('welcomeCreateCollection')}</span>
        </Button>

        <Button type="button" variant="outline" className={CTA_CLASS} onClick={onConnectAI}>
          <Sparkles className="text-primary" />
          <span>{t('welcomeConnectAI')}</span>
        </Button>
      </div>

      {/* Don't show again */}
      <div className="mt-4 text-center">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-xs text-muted-foreground"
          onClick={onDismiss}
        >
          {t('welcomeDismiss')}
        </Button>
      </div>
    </Card>
  );
}
