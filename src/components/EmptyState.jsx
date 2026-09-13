import React from 'react';
import { Search } from 'lucide-react';
import { t } from '../lib/i18n';
import { Button } from './ui/button';

/**
 * V2-C — the design's filtered-empty state (search with no hits, or the
 * active-collection filter yields nothing). This is distinct from the
 * onboarding `WelcomeCard`, which covers a truly empty TabHub (no
 * user-created collections at all) and is left untouched in main.jsx.
 */
export function EmptyState({ variant, onClearSearch, onClearCollectionFilter }) {
  const isSearch = variant === 'search';
  const title = isSearch ? t('emptySearchTitle') : t('emptyCollectionTitle');
  const hint = isSearch ? t('emptySearchHint') : t('emptyCollectionHint');

  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 pt-3 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-faint">
        <Search className="size-[17px]" aria-hidden="true" />
      </div>
      <div>
        <div className="text-[12.5px] font-medium text-foreground">{title}</div>
        <div className="mt-1 text-[11.5px] text-muted-foreground">{hint}</div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-[30px] text-[12.5px]"
        onClick={() => {
          onClearSearch?.();
          onClearCollectionFilter?.();
        }}
      >
        {t('clearFilters')}
      </Button>
    </div>
  );
}
