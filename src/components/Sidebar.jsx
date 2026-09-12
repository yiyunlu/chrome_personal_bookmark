import React from 'react';
import { Bookmark, ChevronLeft, ChevronRight, FolderOpen, GripVertical, Monitor, Moon, Settings, Sun, Trash2 } from 'lucide-react';
import Sortable from 'sortablejs';
import { t } from '../lib/i18n';
import { cn } from '../lib/cn';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/* The two sidebar selects.

   P4 gave the trigger the geometry and inline surface colours of the bare
   native select it replaced, because shadcn's `bg-transparent` / `border-input`
   defaults disappear into the sidebar's own panel. P5b keeps that *intent* but
   expresses it in token classes — `bg-background border-input text-foreground`,
   which is exactly what the legacy --input-bg / --input-border / --text
   aliases resolve to — and drops the geometry override, because the contract puts
   select triggers on `rounded-md` and shadcn's own `h-9 px-3` is the one control
   height in the system. tailwind-merge resolves `bg-transparent` → `bg-background`
   and `shadow-sm` → `shadow-none`; nothing here touches a ring class, so the
   `ring-<colour>` / `ring-opacity-*` conflict-group trap P3 hit cannot bite. */
const SELECT_TRIGGER_CLASS = 'w-full bg-background border-input text-foreground shadow-none';
/* `z-[110]` matches P3's value (it needs to clear DialogShell's z-90/z-100 in
   the dialogs; these two are not in a dialog, but the two files should not
   disagree). The viewport override undoes shadcn's
   arbitrary --radix-select-trigger-height height, which pins the popper list to one
   row tall; `Viewport` takes no className from callers, so it is reached from
   its ancestor. */
const SELECT_CONTENT_CLASS = 'z-[110] [&_[data-radix-select-viewport]]:h-auto';

/* The meta type role from the style contract (`text-xs text-muted-foreground`),
   plus the sidebar's own uppercase treatment.

   `leading-none` is restated on purpose. tailwind-merge puts `leading-*` in
   `font-size`'s conflicting groups, so overriding shadcn `Label`'s `text-sm`
   with `text-xs` silently deletes the `leading-none` that came *before* it —
   the same class of trap as P3's `ring-opacity-*` / `ring-<colour>` deletion,
   found by resolving the merged string rather than reading the source. */
const SECTION_LABEL_CLASS = 'block text-xs leading-none uppercase tracking-wider mb-1.5 text-muted-foreground';
/* A full-width nav row: the expanded rail's list items and bottom actions.
   `h-auto py-1.5` replaces the `h-9 px-4 py-2` of Button's default size, and
   `justify-start` the cva's `justify-center`. */
const NAV_ROW_CLASS = 'w-full justify-start gap-2 px-2 h-auto py-1.5 text-sm text-left';
/* The collapsed rail's icon rows. Not `size="icon"` (h-9 w-9): the rail is
   3.5rem wide and these stretch across it, the way the expanded rows do. */
const RAIL_ROW_CLASS = 'w-full h-auto px-0 py-1.5';

/**
 * Is a SortableJS gesture in flight anywhere on the page?
 *
 * SortableJS records the whole gesture on its own constructor:
 * `Sortable.dragged` is set from the pointerdown on a drag handle
 * (sortable.esm.js:1283) and both it and `Sortable.active` (set at 1435) are
 * cleared by `_nulling()` on drop or cancel (2057). Reading those statics keeps
 * the guard out of React state on purpose — setting state mid-drag is exactly
 * what makes React reconcile over SortableJS's DOM mutation and throw in
 * removeChild, which `main.jsx` goes to some trouble to avoid.
 */
function dragInProgress() {
  return !!(Sortable.dragged || Sortable.active);
}

/**
 * An icon-only button with a tooltip.
 *
 * `label` is used twice and for two different jobs: as the tooltip text, and as
 * the button's `aria-label`. A Radix tooltip only *describes* its trigger
 * (`aria-describedby`), so on a button with no text node it cannot supply the
 * accessible name — which is what the `title` attributes it replaces used to do
 * by accident.
 *
 * Controlled rather than uncontrolled so the drag guard can refuse to open.
 */
function IconTooltip({ label, side = 'right', children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        // A collection row being reordered, or a card dragged across the rail,
        // drags the pointer over these buttons. A tooltip popping up over the
        // drop target mid-drag is never what the user meant.
        if (next && dragInProgress()) return;
        setOpen(next);
      }}
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  sources,
  activeSourceId,
  onSourceChange,
  themeMode,
  onThemeModeChange,
  languageSetting,
  onLanguageChange,
  collections,
  activeCollectionId,
  onCollectionSelect,
  canSortCollections,
  onCollectionContextMenu,
  collapsed,
  onToggleCollapse,
  onViewTrash,
  onOpenSettings,
  hasTrash
}) {
  const themeOptions = [
    { value: 'system', icon: Monitor, label: t('themeSystem') },
    { value: 'light', icon: Sun, label: t('themeLight') },
    { value: 'dark', icon: Moon, label: t('themeDark') }
  ];
  const collapseLabel = collapsed ? t('expandSidebar') : t('collapseSidebar');
  return (
    // Renders no DOM of its own, so the nav's SortableJS host keeps its exact
    // depth and child list.
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'flex flex-col flex-shrink-0 min-h-screen select-none border-r border-border bg-sidebar text-foreground',
          // was an inline `transition: width 0.2s cubic-bezier(0.4,0,0.2,1)`;
          // `ease-smooth` is that curve, registered in tailwind.config.js.
          'transition-[width] duration-200 ease-smooth',
          collapsed ? 'w-14' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center px-3 pt-4 pb-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
                {/* Not inside a Button, so it carries the contract's size={16}. */}
                <Bookmark size={16} className="text-primary" />
              </div>
              <div className="text-sm font-semibold tracking-wide">TabHub</div>
            </div>
          )}
          <IconTooltip label={collapseLabel}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-7 w-7 flex-shrink-0 bg-accent hover:bg-accent/80"
              aria-label={collapseLabel}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          </IconTooltip>
        </div>

        {collapsed ? (
          <>
            {/* Collapsed rail: logo */}
            <div className="flex items-center justify-center py-2">
              <IconTooltip label={t('allCollections')}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    activeCollectionId === 'all' ? 'bg-accent text-primary' : 'text-muted-foreground'
                  )}
                  aria-label={t('allCollections')}
                  onClick={() => onCollectionSelect('all')}
                >
                  <Bookmark />
                </Button>
              </IconTooltip>
            </div>

            {/* Collapsed rail: divider */}
            <Separator className="mx-2 mb-1 w-auto" />

            {/* Collapsed rail: collection icons.
                No ScrollArea here — see the note on the expanded nav below. */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-2 space-y-0.5">
              {collections.map((collection) => {
                const isActive = activeCollectionId === collection.id;
                return (
                  <IconTooltip key={collection.id} label={collection.title}>
                    <Button
                      variant="ghost"
                      className={cn(RAIL_ROW_CLASS, isActive ? 'bg-secondary text-primary' : 'text-muted-foreground')}
                      aria-label={collection.title}
                      onClick={() => onCollectionSelect(collection.id)}
                    >
                      <FolderOpen />
                    </Button>
                  </IconTooltip>
                );
              })}
            </nav>

            {/* Collapsed rail: bottom icons */}
            <div className="px-1.5 pb-3 mt-auto space-y-0.5">
              <Separator className="mx-0.5 mb-1 w-auto" />
              {hasTrash && (
                <IconTooltip label={t('trash')}>
                  <Button
                    variant="ghost"
                    className={cn(RAIL_ROW_CLASS, 'text-muted-foreground')}
                    aria-label={t('trash')}
                    onClick={onViewTrash}
                  >
                    <Trash2 />
                  </Button>
                </IconTooltip>
              )}
              <IconTooltip label={t('settings')}>
                <Button
                  variant="ghost"
                  className={cn(RAIL_ROW_CLASS, 'text-muted-foreground')}
                  aria-label={t('settings')}
                  onClick={onOpenSettings}
                >
                  <Settings />
                </Button>
              </IconTooltip>
            </div>
          </>
        ) : (
          <>
            {/* Source selector */}
            <div className="px-3 mb-3">
              <Label htmlFor="tabhub-source-select" className={SECTION_LABEL_CLASS}>
                {t('bookmarkSource')}
              </Label>
              <Select value={activeSourceId} onValueChange={onSourceChange}>
                <SelectTrigger
                  id="tabhub-source-select"
                  aria-label={t('bookmarkSource')}
                  className={SELECT_TRIGGER_CLASS}
                >
                  <SelectValue placeholder={t('bookmarkSource')} />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT_CLASS}>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.isTabHub ? 'TabHub' : source.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme toggle.
                The heading names three buttons, not a control, so it is a <div>
                naming a role="group" rather than a <label> with no `for` —
                P3 made the same call for SettingsModal's "Data" heading. */}
            <div className="px-3 mb-4">
              <div id="tabhub-theme-label" className={SECTION_LABEL_CLASS}>
                {t('theme')}
              </div>
              <div
                role="group"
                aria-labelledby="tabhub-theme-label"
                className="flex rounded-lg border border-input bg-background p-0.5"
              >
                {themeOptions.map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant="ghost"
                    size="sm"
                    onClick={() => onThemeModeChange(value)}
                    /* px-0 and gap-1 because three of these share a 16rem rail
                       and the contract's 16px icon is 3px wider than the 13px
                       one it replaces. */
                    className={cn(
                      'flex-1 min-w-0 h-7 gap-1 px-0',
                      themeMode === value ? 'bg-accent text-primary' : 'text-muted-foreground'
                    )}
                    /* Not an IconTooltip: the label is rendered next to the icon
                       (it only hides below 640px, where a hover tooltip is no
                       use anyway), so a tooltip would just repeat visible text.
                       aria-label is still needed — `hidden` takes the span away
                       from assistive tech at narrow widths. */
                    aria-label={label}
                  >
                    <Icon />
                    <span className="hidden sm:inline truncate">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div className="px-3 mb-4">
              <Label htmlFor="tabhub-language-select" className={SECTION_LABEL_CLASS}>
                {t('language')}
              </Label>
              <Select value={languageSetting} onValueChange={onLanguageChange}>
                <SelectTrigger
                  id="tabhub-language-select"
                  aria-label={t('language')}
                  className={SELECT_TRIGGER_CLASS}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT_CLASS}>
                  <SelectItem value="auto">{t('langAuto')}</SelectItem>
                  <SelectItem value="zh-CN">{t('langZh')}</SelectItem>
                  <SelectItem value="en">{t('langEn')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Divider */}
            <Separator className="mx-3 mb-2 w-auto" />

            {/* Collections nav.
                Deliberately NOT a shadcn ScrollArea. This <nav> is the
                `[data-nav-sortable]` host `main.jsx:344` finds by query, and
                `main.jsx:359` reads its order back by querying the container
                for the draggable rows below. (Spelled out rather than quoted
                so gate 9's attribute count stays a count of real attributes.)
                Radix's
                Viewport renders its children inside a
                `style={{minWidth:'100%',display:'table'}}` div
                (@radix-ui/react-scroll-area/dist/index.mjs:125) and moves the
                scroll container off this element, which is precisely the kind
                of structural change SortableJS's auto-scroll and main.jsx's
                mid-drag DOM revert are sensitive to. A native `overflow-y-auto`
                keeps the host, its child list and its scroll parent identical
                to the P5 baseline. The collapsed rail matches it so that
                toggling the sidebar does not change how the list scrolls. */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-0.5" data-nav-sortable="true">
              <Button
                variant="ghost"
                className={cn(
                  NAV_ROW_CLASS,
                  activeCollectionId === 'all' ? 'bg-secondary text-primary font-semibold' : 'font-normal'
                )}
                onClick={() => onCollectionSelect('all')}
              >
                <Bookmark className="opacity-70" />
                <span className="truncate">{t('allCollections')}</span>
              </Button>

              {collections.map((collection) => {
                const isActive = activeCollectionId === collection.id;
                const isDraggable = canSortCollections && collection.editable && collection.parentId === activeSourceId;
                return (
                  <Button
                    key={collection.id}
                    data-collection-id={collection.id}
                    data-draggable={String(isDraggable)}
                    variant="ghost"
                    className={cn(
                      'group',
                      NAV_ROW_CLASS,
                      isActive ? 'bg-secondary text-primary font-semibold' : 'font-normal'
                    )}
                    onClick={() => onCollectionSelect(collection.id)}
                    onContextMenu={(e) => onCollectionContextMenu(e, collection)}
                    title={collection.editable || collection.deletable ? t('rightClickHint') : ''}
                  >
                    <span
                      className={cn(
                        'nav-drag-handle flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab',
                        !isDraggable && 'invisible'
                      )}
                    >
                      <GripVertical />
                    </span>
                    <FolderOpen className="opacity-60" />
                    <span className="truncate flex-1">{collection.title}</span>
                    <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                      {collection.cards.length}
                    </span>
                  </Button>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="px-3 pb-3 mt-auto space-y-1">
              <Separator className="mb-2 w-auto" />
              {hasTrash && (
                <Button
                  variant="ghost"
                  className={cn(NAV_ROW_CLASS, 'font-normal text-muted-foreground')}
                  onClick={onViewTrash}
                >
                  <Trash2 className="opacity-60" />
                  <span>{t('trash')}</span>
                </Button>
              )}
              <Button
                variant="ghost"
                className={cn(NAV_ROW_CLASS, 'font-normal text-muted-foreground')}
                onClick={onOpenSettings}
              >
                <Settings className="opacity-60" />
                <span>{t('settings')}</span>
              </Button>
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}
