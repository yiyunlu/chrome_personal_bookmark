import React from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  GripVertical,
  Languages,
  Menu,
  Monitor,
  Moon,
  Settings,
  Sun,
  Trash2
} from 'lucide-react';
import Sortable from 'sortablejs';
import { t } from '../lib/i18n';
import { cn } from '../lib/cn';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/* S1 — the rail on TabHub.dc.html.
   Every number below comes from the design file; the radius values are mapped
   onto the contract's scale (`rounded-sm` 6px · `rounded-md` 8px ·
   `rounded-lg`/`rounded-xl` 9px), so the design's 5px and 7px corners both land
   on `rounded-sm`, the nearest value the scale has. Nothing here writes a raw
   `var()` or a hex colour: the design's --panel is `bg-sidebar`, --line is
   `border-border`, --dim is `text-muted-foreground`, --faint is `text-faint`,
   --cardh is `bg-accent` (shadcn's hover surface) and --accentSoft is
   `bg-primary/10`. */

/* The two sidebar selects.

   The design draws one control here — a 30px, bordered, transparent row with a
   menu glyph, the value, and a chevron. The source switcher takes that geometry
   but stays a `Select` (choosing among N sources is behaviour, and the design's
   cycling button cannot express it); the language switcher, which the design
   does not draw at all, is given the same control so the two read as a pair.

   Every class here displaces a vendored one, so the merged string was resolved
   through `cn()` rather than read off the source: `h-[30px]` beats `h-9`,
   `rounded-sm` beats `rounded-md`, `border-border` beats `border-input`,
   `px-2 py-0` beats `px-3 py-2`, `text-xs` beats `text-sm` and `shadow-none`
   beats `shadow-sm`. No `leading-*` is written before `text-xs` — that is the
   deletion mechanism P5b hit on `Label` — and nothing touches a ring class, so
   the `ring-<colour>` / `ring-opacity-*` trap from P3 cannot bite either.
   `[&>span]:flex-1` makes SelectValue's span take the slack so the chevron
   stays pinned right; the vendored `[&>span]:line-clamp-1` still truncates it.

   Checked separately: an unprefixed override does not displace a *responsive*
   variant of the same property — tailwind-merge keys `md:text-*` in its own
   conflict group, so `Input`'s `text-base md:text-sm` survives a bare
   `text-[12.5px]` and wins from 768px up. None of the primitives this file
   composes (Button, Select*, Separator, Tooltip) carries a responsive prefix —
   only `ui/input.jsx` does, and this file does not use it — and nothing here
   writes one either, so that mechanism has nothing to bite. */
const SELECT_TRIGGER_CLASS =
  'h-[30px] w-full gap-2 rounded-sm border-border bg-transparent px-2 py-0 text-xs shadow-none [&>span]:flex-1 [&>span]:text-left';
/* `z-[110]` matches P3's value (it needs to clear DialogShell's z-90/z-100 in
   the dialogs; these two are not in a dialog, but the two files should not
   disagree). The viewport override undoes shadcn's
   arbitrary --radix-select-trigger-height height, which pins the popper list to one
   row tall; `Viewport` takes no className from callers, so it is reached from
   its ancestor. */
const SELECT_CONTENT_CLASS = 'z-[110] [&_[data-radix-select-viewport]]:h-auto';

/* The design's nav section label: 14px above, 5px below, 8px in from the nav's
   own 6px gutter (hence `px-3.5` — this element sits outside the nav, see the
   note on the nav host), 10px/600, .09em tracking, uppercase, `--faint`. */
const SECTION_LABEL_CLASS =
  'px-3.5 pt-3.5 pb-[5px] text-[10px] font-semibold uppercase leading-none tracking-[0.09em] text-faint';

/* Counts — the design sets every one of them in the mono face at 10.5px with
   .02em tracking, which is its strongest identifying feature rather than
   decoration. `leading-none` is restated *after* `text-[10.5px]`: font-size
   lists `leading-*` among its conflicting groups, so writing it first would
   silently delete it. */
const COUNT_CLASS = 'flex-shrink-0 font-mono text-[10.5px] leading-none tracking-[0.02em] tabular-nums';

/* A full-width nav row, at the design's 30px / 6px-corner geometry.
   `h-[30px] px-2 py-0` replaces the `h-9 px-4 py-2` of Button's default size,
   `justify-start` the cva's `justify-center`, `font-normal` its `font-medium`,
   and `rounded-sm` its `rounded-md`. `leading-none` again comes *after*
   `text-[13px]`. Button's ghost variant already supplies the design's hover
   pair (--cardh surface, --ink text) as `hover:bg-accent
   hover:text-accent-foreground`. */
const NAV_ROW_CLASS =
  'w-full justify-start gap-1.5 h-[30px] px-2 py-0 rounded-sm text-[13px] leading-none font-normal text-left';

/* The width of the drag handle plus the row's gap. The design has no drag
   handles (they are hover-only, so its static render never showed them), so its
   rows put the folder glyph at the row's leading edge. Ours cannot: SortableJS's
   `handle:` selector has to stay the row's first child, at the frozen path the
   drag-host fixture pins. The "all collections" row has no handle, so it carries
   a spacer of the same width to keep every glyph on one vertical line. */
const HANDLE_GUTTER_CLASS = 'w-4 flex-shrink-0';

/* The collapsed rail's icon rows. Not `size="icon"` (h-9 w-9): the rail is
   3.5rem wide and these stretch across it, the way the expanded rows do. */
const RAIL_ROW_CLASS = 'w-full h-[30px] px-0 py-0 rounded-sm';

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
  // The design's logo block and its "all collections" row both show the rail's
  // total bookmark count.
  const totalCount = collections.reduce((sum, collection) => sum + collection.cards.length, 0);
  const allActive = activeCollectionId === 'all';
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
          // The design's rail is 232px. Tailwind's spacing scale has no 58, so
          // this is the one width written as an explicit pixel value.
          collapsed ? 'w-14' : 'w-[232px]'
        )}
      >
        {/* Logo block: 14px/14px/12px padding, a 20px accent tile, the wordmark,
            and the total count right-aligned in mono. The collapse toggle is
            ours, not the design's — it keeps the surface and geometry it had. */}
        <div
          className={cn(
            'flex items-center gap-2 px-3.5 pt-3.5 pb-3',
            collapsed && 'justify-center px-0'
          )}
        >
          {!collapsed && (
            <>
              <div className="flex items-center justify-center w-5 h-5 rounded-sm bg-primary">
                {/* Not inside a Button, so it carries the contract's size={16}. */}
                <Bookmark size={16} className="text-primary-foreground" />
              </div>
              <div className="text-[13.5px] font-semibold tracking-[-0.01em]">TabHub</div>
              <span data-total-count className={cn('ml-auto', COUNT_CLASS, 'text-faint')}>
                {totalCount}
              </span>
            </>
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
                    'h-8 w-8 rounded-sm',
                    allActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
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
            <nav className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-2 space-y-px">
              {collections.map((collection) => {
                const isActive = activeCollectionId === collection.id;
                return (
                  <IconTooltip key={collection.id} label={collection.title}>
                    <Button
                      variant="ghost"
                      className={cn(
                        RAIL_ROW_CLASS,
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                      )}
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
            <div className="px-1.5 pb-3 mt-auto space-y-px border-t border-border pt-2">
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
            {/* Source switcher, and the language switcher wearing the same
                control. The design's slot is `padding: 0 10px 8px`.
                Neither carries a visible label any more — the design's control
                shows a glyph and the value — so the accessible name comes from
                `aria-label` on the trigger, as it already did. */}
            <div className="px-2.5 pb-2 space-y-1.5">
              <Select value={activeSourceId} onValueChange={onSourceChange}>
                <SelectTrigger
                  id="tabhub-source-select"
                  aria-label={t('bookmarkSource')}
                  className={SELECT_TRIGGER_CLASS}
                >
                  <Menu size={16} className="flex-shrink-0 opacity-60" />
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

              <Select value={languageSetting} onValueChange={onLanguageChange}>
                <SelectTrigger
                  id="tabhub-language-select"
                  aria-label={t('language')}
                  className={SELECT_TRIGGER_CLASS}
                >
                  <Languages size={16} className="flex-shrink-0 opacity-60" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT_CLASS}>
                  <SelectItem value="auto">{t('langAuto')}</SelectItem>
                  <SelectItem value="zh-CN">{t('langZh')}</SelectItem>
                  <SelectItem value="en">{t('langEn')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* The design's nav section label (`navCategories`).

                It sits *above* the nav rather than between the "all collections"
                row and the folder rows, where the design puts it. The nav below
                is the `[data-nav-sortable]` host, and SortableJS indexes
                `evt.from.children[oldIndex]`: every one of its element children
                is a row. src/test/SidebarDragHost.test.jsx freezes that child
                list against a baseline fixture, so no non-row element may be
                added inside it. */}
            <div className={SECTION_LABEL_CLASS} data-nav-section-label>
              {t('navCategories')}
            </div>

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
            <nav
              className="flex-1 min-h-0 overflow-y-auto px-1.5 pt-1 pb-2.5 space-y-px"
              data-nav-sortable="true"
            >
              <Button
                variant="ghost"
                className={cn(NAV_ROW_CLASS, allActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                onClick={() => onCollectionSelect('all')}
              >
                <span aria-hidden="true" className={HANDLE_GUTTER_CLASS} />
                <Bookmark className="text-primary" />
                <span className="truncate flex-1 font-medium">{t('allCollections')}</span>
                <span data-nav-count className={cn(COUNT_CLASS, 'text-primary')}>
                  {totalCount}
                </span>
              </Button>

              {collections.map((collection) => {
                const isActive = activeCollectionId === collection.id;
                const isDraggable = canSortCollections && collection.editable && collection.parentId === activeSourceId;
                // The design encodes depth as the width of a leading spacer:
                // 22px for a nested folder against 8px for a top-level one. The
                // 14px difference is what this element carries; the 8px floor is
                // the row's own padding.
                const isNested = collection.parentId !== activeSourceId;
                return (
                  <Button
                    key={collection.id}
                    data-collection-id={collection.id}
                    data-draggable={String(isDraggable)}
                    variant="ghost"
                    className={cn(
                      'group',
                      NAV_ROW_CLASS,
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
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
                    <span
                      aria-hidden="true"
                      data-nav-indent={isNested ? 'nested' : 'root'}
                      className={cn('flex-shrink-0', isNested ? 'w-3.5' : 'w-0')}
                    />
                    <FolderOpen />
                    <span className="truncate flex-1">{collection.title}</span>
                    <span
                      data-nav-count
                      className={cn(COUNT_CLASS, isActive ? 'text-primary' : 'text-faint')}
                    >
                      {collection.cards.length}
                    </span>
                  </Button>
                );
              })}
            </nav>

            {/* Bottom bar: 1px rule, 8px padding, 6px gaps. A segmented control
                for the theme — three options, where the design drew two — then a
                spacer, then the trash (ours, not the design's) and settings. */}
            <div className="mt-auto flex items-center gap-1.5 border-t border-border p-2">
              {/* The heading names three buttons, not a control, so the group is
                  named by `aria-label` rather than by a visible <label> with no
                  `for`. The design gives this control no visible label. */}
              <div
                role="group"
                aria-label={t('theme')}
                className="flex items-center gap-0.5 rounded-sm border border-border bg-card p-0.5"
              >
                {themeOptions.map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant="ghost"
                    size="icon"
                    onClick={() => onThemeModeChange(value)}
                    className={cn(
                      'h-[22px] w-[26px] rounded-sm',
                      themeMode === value ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    )}
                    /* The label is no longer rendered — the design's segmented
                       control is icon-only — so `aria-label` is the only name
                       these buttons have. */
                    aria-label={label}
                  >
                    <Icon />
                  </Button>
                ))}
              </div>

              <div className="flex-1" />

              {hasTrash && (
                <IconTooltip label={t('trash')} side="top">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[26px] w-[26px] rounded-sm text-muted-foreground"
                    aria-label={t('trash')}
                    onClick={onViewTrash}
                  >
                    <Trash2 />
                  </Button>
                </IconTooltip>
              )}
              <Button
                variant="ghost"
                className="h-[26px] min-w-0 gap-1.5 rounded-sm px-2 py-0 text-[11.5px] leading-none font-normal text-muted-foreground"
                onClick={onOpenSettings}
              >
                <Settings />
                <span className="truncate">{t('settings')}</span>
              </Button>
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}
