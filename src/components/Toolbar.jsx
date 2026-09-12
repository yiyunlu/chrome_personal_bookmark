import React from 'react';
import { AlertTriangle, Brain, CheckSquare, Download, Plus, Search, Sparkles, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '../lib/i18n';

// Keeps shadcn's Button visually identical to the previous hand-rolled toolbar
// buttons: 14px icons (cva defaults to size-4) and a 6px gap (cva uses gap-2).
const TOOLBAR_BTN = 'text-sm gap-1.5 [&_svg]:size-3.5';

// Same idea for the search field: shadcn's Input is h-9/rounded-md/shadow-sm with
// a 1px `ring` in the shadcn ring colour.
const SEARCH_INPUT =
  'h-auto w-full max-w-2xl rounded-xl py-2.5 pl-9 pr-16 text-sm shadow-none ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

export function Toolbar({
  activeSource,
  activeSourceId,
  tabHubRootId,
  onSaveTabs,
  manageMode,
  onToggleManage,
  autoOrganizing,
  onAutoOrganize,
  onAICategorize,
  onCheckDeadLinks,
  onNewCollection,
  search,
  onSearchChange,
  searchInputRef
}) {
  return (
    <header className="mb-5 space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted)' }}
        />
        <Input
          ref={searchInputRef}
          id="tabhub-search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          // Overrides of shadcn's Input base (cn() is twMerge, so these win):
          // the toolbar search keeps its 2xl pill shape, 10px vertical padding,
          // 14px text, no elevation and the project's accent focus ring.
          className={SEARCH_INPUT}
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
        />
        <kbd
          className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[0.65rem] border pointer-events-none"
          style={{ borderColor: 'var(--input-border)', color: 'var(--muted)' }}
        >
          /
        </kbd>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          className={TOOLBAR_BTN}
          onClick={onSaveTabs}
          disabled={!activeSourceId && !tabHubRootId}
          title={t('shortcutSaveKey')}
        >
          <Download />
          <span>{t('saveTabs')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={TOOLBAR_BTN}
          onClick={onAutoOrganize}
          disabled={autoOrganizing}
          title={t('shortcutOrganizeKey')}
        >
          <Sparkles style={{ color: 'var(--accent)' }} />
          <span>{autoOrganizing ? t('autoOrganizing') : t('autoOrganize')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={TOOLBAR_BTN}
          onClick={onAICategorize}
          title={t('shortcutAICategorize')}
        >
          <Brain style={{ color: 'var(--accent)' }} />
          <span>{t('aiCategorize')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={TOOLBAR_BTN}
          onClick={onCheckDeadLinks}
          title={t('shortcutDeadLink')}
        >
          <AlertTriangle style={{ color: 'var(--danger)' }} />
          <span>{t('deadLinkCheck')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={TOOLBAR_BTN}
          onClick={onNewCollection}
        >
          <Plus style={{ color: 'var(--accent)' }} />
          <span>{t('newCollection')}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={TOOLBAR_BTN}
          onClick={onToggleManage}
          title={t('shortcutManageKey')}
          // Active state keeps the project's accent-soft look rather than
          // shadcn's `secondary` surface, so manage mode reads the same as before.
          style={
            manageMode
              ? {
                  background: 'var(--accent-soft)',
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)'
                }
              : undefined
          }
        >
          {manageMode ? <CheckSquare /> : <Square />}
          <span>{manageMode ? t('exitManageMode') : t('enterManageMode')}</span>
        </Button>

        {activeSource && (
          <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
            {t('current')}: {activeSource.isTabHub ? 'TabHub' : activeSource.title}
          </span>
        )}
      </div>
    </header>
  );
}

export function BatchToolbar({ selectedCount, onBatchMove, onBatchTrash, onClearSelections }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-4 px-3 py-2 rounded-xl border animate-fade-in"
      style={{
        background: 'var(--accent-soft)',
        borderColor: 'var(--accent)'
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
        {t('selectedCount', selectedCount)}
      </span>
      <div className="flex-1" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto px-2.5 py-1 text-xs"
        disabled={selectedCount === 0}
        onClick={onBatchMove}
      >
        {t('batchMove')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-2.5 py-1 text-xs"
        disabled={selectedCount === 0}
        onClick={onBatchTrash}
        // Soft-danger fill, not shadcn's solid `destructive`, to match the old look.
        style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
      >
        {t('delete')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto px-2.5 py-1 text-xs font-normal"
        onClick={onClearSelections}
        style={{ color: 'var(--muted)' }}
      >
        {t('clearSelection')}
      </Button>
    </div>
  );
}
