import React from 'react';
import {
  AlertTriangle,
  Brain,
  CheckSquare,
  Download,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  Square
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { t } from '../lib/i18n';
import { cn } from '../lib/cn';

/* S2 — the header from TabHub.dc.html, expressed in token classes.

   Geometry that is not on a Tailwind step (34px search, 30px control rows,
   26px view buttons) is written as an arbitrary length, the way P5a wrote the
   design's 12.5px/10.5px tile type. Radii are the only values forced onto a
   scale, per the style contract: the design's 4px and 5px both round to
   `rounded-sm` (6px), its 8px is `rounded-md` exactly.

   Icon sizes come from the contract, not the design: nothing passes a `size`
   prop inside a <Button> (the cva's `[&_svg]:size-4` owns it), so the design's
   13px glyphs render at 16px. The `[&_svg]:size-3.5` override P0 added here is
   gone, as the contract requires. */

/* Search field. Overrides of shadcn's Input base, all resolved through cn():
   `h-9`→34px, `border-input`→`border-border` (the design's --line; the focus
   state is what moves it to --line2), `bg-transparent`→`bg-card`,
   `px-3 py-1`→`p-0 pl-8 pr-10` (0 40px 0 32px), `shadow-sm`→none.

   The accent focus ring is kept from P3 and is now a token class. It is written
   as `ring-2` + `ring-primary`: those are two different tailwind-merge groups
   (`ring-w` and `ring-color`), unlike the arbitrary accent ring / `ring-opacity-30`
   pair that silently resolved to the opacity alone and cost nine controls their
   accent ring.

   `md:text-[12.5px]` is not redundant. shadcn's Input ships `text-base md:text-sm`;
   tailwind-merge keys the responsive variant separately, so an unprefixed
   `text-[12.5px]` removes `text-base` and leaves `md:text-sm` — which then wins
   from 768px up, i.e. on every real window. Found by resolving the string, not
   by reading it: the previous `text-sm` here happened to agree with the
   leftover, so the bug had nowhere to show. */
const SEARCH_INPUT_CLASS = cn(
  'h-[34px] w-full rounded-md border-border bg-card p-0 pl-8 pr-10 shadow-none',
  'text-[12.5px] md:text-[12.5px] text-foreground',
  'focus-visible:border-input focus-visible:ring-2 focus-visible:ring-primary'
);

/* Row 2's ghost actions: 30px tall, 10px side padding, 12px text.
   `hover:bg-accent hover:text-accent-foreground` from the ghost variant is
   replaced by the design's own hover (--card surface, --ink text). */
const GHOST_ACTION_CLASS =
  'h-[30px] gap-1.5 rounded-md px-2.5 text-xs font-normal text-muted-foreground ' +
  'hover:bg-card hover:text-foreground';

/* Save-current-tabs — the one filled action in the header. */
const PRIMARY_ACTION_CLASS = 'h-[30px] gap-1.5 rounded-md px-3 text-xs font-medium shadow-none';

/* Manage mode — a bordered chip on the card surface, not shadcn `outline`'s
   `bg-background`/`border-input`. */
const MANAGE_BASE_CLASS =
  'h-[30px] gap-1.5 rounded-md border-border bg-card px-2.5 text-xs font-normal ' +
  'text-muted-foreground shadow-none hover:bg-accent hover:text-foreground';
/* Manage mode keeps the accent-soft look it had before the migration; the
   hover pair is restated so the base hover cannot paint over it. */
const MANAGE_ACTIVE_CLASS = 'border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary';

/* One cell of the grid/list segmented control. 28x26, 5px→`rounded-sm`.
   The design changes colour only on hover, so the ghost variant's
   `hover:bg-accent` is turned off — otherwise hover and the selected state
   would share a surface. */
const VIEW_BUTTON_CLASS = 'h-[26px] w-7 rounded-sm p-0 hover:bg-transparent';
const VIEW_BUTTON_ACTIVE_CLASS = 'bg-accent text-primary hover:text-primary';
const VIEW_BUTTON_IDLE_CLASS = 'text-muted-foreground hover:text-foreground';

const VIEW_OPTIONS = [
  { value: 'grid', icon: LayoutGrid, labelKey: 'gridView' },
  { value: 'list', icon: List, labelKey: 'listView' }
];

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
  searchInputRef,
  /* S2/S3 interface. Both optional so either phase can merge first:
     `view` falls back to 'grid', and without `onViewChange` the control is
     rendered inert rather than omitted. */
  view = 'grid',
  onViewChange,
  /* Optional; absent (or 0) means no badge on the dead-link action. */
  deadLinkCount
}) {
  const badgeCount = Number(deadLinkCount) > 0 ? deadLinkCount : 0;

  return (
    <header>
      {/* Row 1 — search, spacer, view toggle, manage mode */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1 max-w-[520px]">
          <Search size={16} className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-faint" />
          <Input
            ref={searchInputRef}
            id="tabhub-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className={SEARCH_INPUT_CLASS}
          />
          <kbd className="pointer-events-none absolute right-[9px] top-1/2 -translate-y-1/2 rounded-sm border border-border px-[5px] py-px font-mono text-[10px] text-faint">
            /
          </kbd>
        </div>

        <div className="flex-1" />

        <div
          role="group"
          aria-label={t('viewMode')}
          className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
        >
          {VIEW_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t(labelKey)}
              aria-pressed={view === value}
              disabled={!onViewChange}
              onClick={onViewChange ? () => onViewChange(value) : undefined}
              className={cn(VIEW_BUTTON_CLASS, view === value ? VIEW_BUTTON_ACTIVE_CLASS : VIEW_BUTTON_IDLE_CLASS)}
            >
              <Icon />
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleManage}
          title={t('shortcutManageKey')}
          aria-pressed={!!manageMode}
          className={cn(MANAGE_BASE_CLASS, manageMode && MANAGE_ACTIVE_CLASS)}
        >
          {manageMode ? <CheckSquare /> : <Square />}
          <span>{manageMode ? t('exitManageMode') : t('enterManageMode')}</span>
        </Button>
      </div>

      {/* Row 2 — the filled save action, a divider, then the ghost actions */}
      <div className="flex flex-wrap items-center gap-1.5 pb-[13px] pt-3">
        <Button
          type="button"
          size="sm"
          className={PRIMARY_ACTION_CLASS}
          onClick={onSaveTabs}
          disabled={!activeSourceId && !tabHubRootId}
          title={t('shortcutSaveKey')}
        >
          <Download />
          <span>{t('saveTabs')}</span>
        </Button>

        <div aria-hidden="true" className="mx-[5px] h-[18px] w-px shrink-0 bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={GHOST_ACTION_CLASS}
          onClick={onAutoOrganize}
          disabled={autoOrganizing}
          title={t('shortcutOrganizeKey')}
        >
          <Sparkles />
          <span>{autoOrganizing ? t('autoOrganizing') : t('autoOrganize')}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={GHOST_ACTION_CLASS}
          onClick={onAICategorize}
          title={t('shortcutAICategorize')}
        >
          <Brain />
          <span>{t('aiCategorize')}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={GHOST_ACTION_CLASS}
          onClick={onCheckDeadLinks}
          title={t('shortcutDeadLink')}
        >
          <AlertTriangle />
          <span>{t('deadLinkCheck')}</span>
          {badgeCount > 0 && (
            <span className="rounded-sm bg-primary/10 px-1 py-px font-mono text-[10px] text-primary">{badgeCount}</span>
          )}
        </Button>

        <Button type="button" variant="ghost" size="sm" className={GHOST_ACTION_CLASS} onClick={onNewCollection}>
          <Plus />
          <span>{t('newCollection')}</span>
        </Button>

        {activeSource && (
          <span className="ml-1 text-xs text-muted-foreground">
            {t('current')}: {activeSource.isTabHub ? 'TabHub' : activeSource.title}
          </span>
        )}
      </div>
    </header>
  );
}

export function BatchToolbar({ selectedCount, onBatchMove, onBatchTrash, onClearSelections }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary bg-primary/10 px-3 py-2 animate-fade-in">
      <span className="text-sm font-medium text-primary">{t('selectedCount', selectedCount)}</span>
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
      {/* The contract's inline destructive row action: ghost + text-destructive,
          on a soft destructive fill rather than shadcn's solid `destructive`.
          The ghost variant's hover pair is restated so it cannot repaint this. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto bg-destructive/10 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/20 hover:text-destructive"
        disabled={selectedCount === 0}
        onClick={onBatchTrash}
      >
        {t('delete')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-auto px-2.5 py-1 text-xs font-normal text-muted-foreground"
        onClick={onClearSelections}
      >
        {t('clearSelection')}
      </Button>
    </div>
  );
}
