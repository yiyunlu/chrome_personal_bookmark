import React from 'react';
import { Bookmark, ChevronLeft, ChevronRight, FolderOpen, GripVertical, Monitor, Moon, Settings, Sun, Trash2 } from 'lucide-react';
import Sortable from 'sortablejs';
import { t } from '../lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/* The two sidebar selects. The *trigger* keeps the geometry and surface colours
   of the bare native select it replaces, which matters more here than anywhere
   else in the app: the sidebar has its own dark panel, and shadcn's
   `border-input` / `bg-transparent` defaults read as an invisible control on it.
   tailwind-merge resolves the overlaps (h-9 → h-auto, rounded-md → rounded-lg,
   …). The floating list keeps shadcn's `bg-popover`, matching the context menu
   P2 migrated — it hovers over the page, not over the sidebar. */
const SELECT_SURFACE = {
  background: 'var(--input-bg)',
  borderColor: 'var(--input-border)',
  color: 'var(--text)'
};
const SELECT_TRIGGER_CLASS = 'w-full h-auto rounded-lg px-2.5 py-1.5 text-sm shadow-none';
/* `z-[110]` matches P3's value (it needs to clear DialogShell's z-90/z-100 in
   the dialogs; these two are not in a dialog, but the two files should not
   disagree). The viewport override undoes shadcn's
   `h-[var(--radix-select-trigger-height)]`, which pins the popper list to one
   row tall; `Viewport` takes no className from callers, so it is reached from
   its ancestor. */
const SELECT_CONTENT_CLASS = 'z-[110] [&_[data-radix-select-viewport]]:h-auto';

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
        className="flex flex-col flex-shrink-0 min-h-screen border-r border-[var(--panel-border)] select-none"
        style={{
          width: collapsed ? '3.5rem' : '16rem',
          background: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Header */}
        <div className={`flex items-center px-3 pt-4 pb-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: 'var(--accent-soft)' }}
              >
                <Bookmark size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide">TabHub</div>
              </div>
            </div>
          )}
          <IconTooltip label={collapseLabel}>
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-7 h-7 rounded-md hover:opacity-80"
              style={{ background: 'var(--sidebar-hover)' }}
              aria-label={collapseLabel}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </IconTooltip>
        </div>

        {collapsed ? (
          <>
            {/* Collapsed rail: logo */}
            <div className="flex items-center justify-center py-2">
              <IconTooltip label={t('allCollections')}>
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{
                    background: activeCollectionId === 'all' ? 'var(--accent-soft)' : 'transparent',
                    color: activeCollectionId === 'all' ? 'var(--accent)' : 'var(--muted)'
                  }}
                  aria-label={t('allCollections')}
                  onClick={() => onCollectionSelect('all')}
                >
                  <Bookmark size={16} />
                </button>
              </IconTooltip>
            </div>

            {/* Collapsed rail: divider */}
            <div className="mx-2 mb-1 border-t" style={{ borderColor: 'var(--panel-border)' }} />

            {/* Collapsed rail: collection icons */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-2 space-y-0.5">
              {collections.map((collection) => {
                const isActive = activeCollectionId === collection.id;
                return (
                  <IconTooltip key={collection.id} label={collection.title}>
                    <button
                      className="w-full flex items-center justify-center py-1.5 rounded-lg"
                      style={{
                        background: isActive ? 'var(--sidebar-active)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'inherit'
                      }}
                      aria-label={collection.title}
                      onClick={() => onCollectionSelect(collection.id)}
                    >
                      <FolderOpen size={16} style={{ opacity: isActive ? 1 : 0.6 }} />
                    </button>
                  </IconTooltip>
                );
              })}
            </nav>

            {/* Collapsed rail: bottom icons */}
            <div className="px-1.5 pb-3 mt-auto space-y-0.5">
              <div className="mx-0.5 mb-1 border-t" style={{ borderColor: 'var(--panel-border)' }} />
              {hasTrash && (
                <IconTooltip label={t('trash')}>
                  <button
                    className="w-full flex items-center justify-center py-1.5 rounded-lg hover:opacity-80"
                    style={{ color: 'var(--muted)' }}
                    aria-label={t('trash')}
                    onClick={onViewTrash}
                  >
                    <Trash2 size={16} style={{ opacity: 0.6 }} />
                  </button>
                </IconTooltip>
              )}
              <IconTooltip label={t('settings')}>
                <button
                  className="w-full flex items-center justify-center py-1.5 rounded-lg hover:opacity-80"
                  style={{ color: 'var(--muted)' }}
                  aria-label={t('settings')}
                  onClick={onOpenSettings}
                >
                  <Settings size={16} style={{ opacity: 0.6 }} />
                </button>
              </IconTooltip>
            </div>
          </>
        ) : (
          <>
            {/* Source selector */}
            <div className="px-3 mb-3">
              <label
                htmlFor="tabhub-source-select"
                className="block text-[0.68rem] uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--muted)' }}
              >
                {t('bookmarkSource')}
              </label>
              <Select value={activeSourceId} onValueChange={onSourceChange}>
                <SelectTrigger id="tabhub-source-select" className={SELECT_TRIGGER_CLASS} style={SELECT_SURFACE}>
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

            {/* Theme toggle */}
            <div className="px-3 mb-4">
              <label className="block text-[0.68rem] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                {t('theme')}
              </label>
              <div
                className="flex rounded-lg border p-0.5"
                style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }}
              >
                {themeOptions.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => onThemeModeChange(value)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs"
                    style={{
                      background: themeMode === value ? 'var(--accent-soft)' : 'transparent',
                      color: themeMode === value ? 'var(--accent)' : 'var(--muted)'
                    }}
                    /* Not an IconTooltip: the label is rendered next to the icon
                       (it only hides below 640px, where a hover tooltip is no
                       use anyway), so a tooltip would just repeat visible text.
                       aria-label is still needed — `hidden` takes the span away
                       from assistive tech at narrow widths. */
                    aria-label={label}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div className="px-3 mb-4">
              <label
                htmlFor="tabhub-language-select"
                className="block text-[0.68rem] uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--muted)' }}
              >
                {t('language')}
              </label>
              <Select value={languageSetting} onValueChange={onLanguageChange}>
                <SelectTrigger id="tabhub-language-select" className={SELECT_TRIGGER_CLASS} style={SELECT_SURFACE}>
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
            <div className="mx-3 mb-2 border-t" style={{ borderColor: 'var(--panel-border)' }} />

            {/* Collections nav */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-0.5" data-nav-sortable="true">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left"
                style={{
                  background: activeCollectionId === 'all' ? 'var(--sidebar-active)' : 'transparent',
                  color: activeCollectionId === 'all' ? 'var(--accent)' : 'inherit',
                  fontWeight: activeCollectionId === 'all' ? 600 : 400
                }}
                onClick={() => onCollectionSelect('all')}
              >
                <Bookmark size={15} style={{ opacity: 0.7 }} />
                <span className="truncate">{t('allCollections')}</span>
              </button>

              {collections.map((collection) => {
                const isActive = activeCollectionId === collection.id;
                const isDraggable = canSortCollections && collection.editable && collection.parentId === activeSourceId;
                return (
                  <button
                    key={collection.id}
                    data-collection-id={collection.id}
                    data-draggable={String(isDraggable)}
                    className="group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left"
                    style={{
                      background: isActive ? 'var(--sidebar-active)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'inherit',
                      fontWeight: isActive ? 600 : 400
                    }}
                    onClick={() => onCollectionSelect(collection.id)}
                    onContextMenu={(e) => onCollectionContextMenu(e, collection)}
                    title={collection.editable || collection.deletable ? t('rightClickHint') : ''}
                  >
                    <span
                      className="nav-drag-handle flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab"
                      style={{ visibility: isDraggable ? 'visible' : 'hidden' }}
                    >
                      <GripVertical size={13} />
                    </span>
                    <FolderOpen size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
                    <span className="truncate flex-1">{collection.title}</span>
                    <span className="text-[0.65rem] tabular-nums flex-shrink-0" style={{ color: 'var(--muted)' }}>
                      {collection.cards.length}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="px-3 pb-3 mt-auto space-y-1">
              <div className="border-t mb-2" style={{ borderColor: 'var(--panel-border)' }} />
              {hasTrash && (
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left hover:opacity-80"
                  style={{ color: 'var(--muted)' }}
                  onClick={onViewTrash}
                >
                  <Trash2 size={15} style={{ opacity: 0.6 }} />
                  <span>{t('trash')}</span>
                </button>
              )}
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left hover:opacity-80"
                style={{ color: 'var(--muted)' }}
                onClick={onOpenSettings}
              >
                <Settings size={15} style={{ opacity: 0.6 }} />
                <span>{t('settings')}</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </TooltipProvider>
  );
}
