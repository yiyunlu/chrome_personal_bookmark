import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, AppWindow } from 'lucide-react';
import { t } from '../lib/i18n';
import { logError } from '../lib/utils';
import { cn } from '../lib/cn';
import { startOpenTabDrag } from '../lib/openTabDrag';
import { Button } from './ui/button';
import { BookmarkIcon } from './BookmarkIcon';

/* FEAT-3 — the "Open tabs" drag source.
 *
 * Placement is load-bearing: this panel lives in <main>'s fixed header area, a
 * sibling ABOVE the scroll container. It must never be rendered inside
 * `[data-module-sortable]`, `[data-nav-sortable]` or a `[data-cards-collection-id]`
 * container: SortableJS indexes those containers' children by position. For the
 * same reason its rows carry `data-open-tab-id`, never `data-card-id` (Sortable's
 * `draggable` selector for cards, and what handleCardClick keys on).
 *
 * Collapsed by default, and the tab query only runs once it is opened, so the
 * default new-tab render does no extra work. `loadTabs` is `getOpenTabs`
 * (current window, http/https only). */
export function OpenTabsPanel({ loadTabs }) {
  const [open, setOpen] = useState(false);
  const [tabs, setTabs] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragTimerRef = useRef(null);

  const reload = useCallback(async () => {
    try {
      setTabs(await loadTabs());
    } catch (err) {
      logError('OpenTabsPanel.loadTabs', err);
      setTabs([]);
    }
  }, [loadTabs]);

  useEffect(() => {
    if (!open) return undefined;
    reload();
    // The list is a snapshot: refresh when the user comes back to this tab after
    // opening/closing pages elsewhere in the window.
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [open, reload]);

  useEffect(() => () => clearTimeout(dragTimerRef.current), []);

  const onDragStart = (event, tab) => {
    startOpenTabDrag(event.dataTransfer, tab);
    // Fade the row AFTER the browser has taken its drag image, so the ghost the
    // user carries is not already translucent.
    clearTimeout(dragTimerRef.current);
    dragTimerRef.current = setTimeout(() => setDraggingId(tab.id), 0);
  };
  const onDragEnd = () => {
    clearTimeout(dragTimerRef.current);
    setDraggingId(null);
  };

  return (
    <section data-open-tabs-panel="" className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1 pr-1">
        <Button
          type="button"
          variant="ghost"
          className="h-8 min-w-0 flex-1 justify-start gap-2 px-3 text-[12.5px] font-medium hover:bg-transparent [&_svg]:size-[13px]"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <ChevronDown /> : <ChevronRight />}
          <AppWindow className="text-faint" />
          <span>{t('openTabsPanel')}</span>
          {open && tabs && (
            <span className="font-mono text-[10px] tabular-nums text-faint">{tabs.length}</span>
          )}
        </Button>
        {open && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-[26px] w-[26px] flex-shrink-0 rounded-md text-faint hover:text-foreground"
            aria-label={t('openTabsRefresh')}
            title={t('openTabsRefresh')}
            onClick={reload}
          >
            <RefreshCw />
          </Button>
        )}
      </div>

      {open && (
        <div className="border-t border-border px-3 py-2">
          <div className="mb-1.5 text-[11.5px] text-muted-foreground">{t('openTabsHint')}</div>
          {tabs && tabs.length === 0 ? (
            <div className="py-2 text-[12px] text-faint">{t('openTabsEmpty')}</div>
          ) : (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto">
              {(tabs || []).map((tab) => (
                <li
                  key={tab.id}
                  data-open-tab-id={tab.id}
                  draggable="true"
                  onDragStart={(e) => onDragStart(e, tab)}
                  onDragEnd={onDragEnd}
                  title={tab.url}
                  className={cn(
                    'flex h-8 cursor-grab items-center gap-2.5 rounded-md px-2 transition-colors hover:bg-secondary',
                    draggingId === tab.id && 'opacity-40'
                  )}
                >
                  <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center overflow-hidden rounded-sm bg-secondary">
                    <BookmarkIcon url={tab.url} title={tab.title} />
                  </div>
                  <span className="min-w-0 max-w-[45%] truncate text-[12.5px] text-foreground">{tab.title}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-faint">{tab.url}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
