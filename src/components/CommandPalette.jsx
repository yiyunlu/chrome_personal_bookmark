import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Folder, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { flattenPalette, searchPalette } from '../lib/paletteSearch';
import { logError } from '../lib/utils';
import { BookmarkIcon } from './BookmarkIcon';
import { DialogShell } from './DialogShell';
import { Input } from './ui/input';

/* ─────────────────────────────────────────────────────────────────────────────
   ⌘K / Ctrl+K command palette (FEAT-1).

   `cmdk` is not a dependency and `src/components/ui/command.jsx` is not vendored
   (ui/ is never edited), so this is a small composition instead of a shadcn
   Command: DialogShell (Radix Dialog — focus trap, Escape, portal, return-focus,
   the undo-toast outside-click guard) + the vendored Input + the WAI-ARIA
   combobox/listbox pattern. DOM focus never leaves the input; the highlighted row
   is exposed through `aria-activedescendant`, so typing, arrows, Enter and Esc all
   work from the one focused element and no other global shortcut can see the
   keystrokes (useKeyboardShortcuts ignores inputs, and `disabled` is on while this
   is open).

   Layering: DialogShell's z-[90] layer. The undo toast is a popover top-layer node
   and main.jsx passes `paletteOpen` into UndoToast's `elevate`, so the toast stays
   on top and clickable exactly as with the other dialogs.

   Data is passed in (bookmarks / collections from App state) except open tabs,
   which are fetched through `loadTabs` each time the palette opens so the list is
   current. Nothing here talks to a backend.
   ──────────────────────────────────────────────────────────────────────────── */

const PANEL_CLASS = 'top-[18%] max-w-xl translate-y-0';
const INPUT_WRAP_CLASS = 'flex items-center gap-2.5 border-b border-border px-4';
const INPUT_CLASS = 'h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 md:text-sm';
const LIST_CLASS = 'max-h-[min(380px,55vh)] overflow-y-auto p-1.5';
const GROUP_LABEL_CLASS = 'px-2.5 pb-1 pt-2 text-[11px] font-medium text-faint';
const ROW_CLASS =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground';
const FOOTER_CLASS =
  'flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground';
const KBD_CLASS = 'rounded-sm border border-border px-[5px] py-px font-mono text-[10px] text-faint';

const GROUPS = [
  { name: 'bookmarks', labelKey: 'cmdkGroupBookmarks' },
  { name: 'collections', labelKey: 'cmdkGroupCollections' },
  { name: 'tabs', labelKey: 'cmdkGroupTabs' }
];

function PaletteRow({ item, id, active, onHover, onPick }) {
  const ref = useRef(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  return (
    <div
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      data-palette-item={item.key}
      data-active={active ? 'true' : undefined}
      className={cn(ROW_CLASS, active ? 'bg-accent' : 'bg-transparent')}
      onMouseMove={onHover}
      onClick={(event) => onPick(item, event)}
    >
      <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center overflow-hidden rounded-sm bg-secondary">
        {item.type === 'collection' ? (
          <Folder className="size-3.5 text-muted-foreground" aria-hidden="true" />
        ) : (
          <BookmarkIcon url={item.url} title={item.title} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate">{item.title}</div>
      </div>
      <div className="max-w-[40%] flex-shrink-0 truncate text-xs text-faint">
        {item.type === 'collection' ? t('cmdkCollectionCount', item.count) : item.subtitle}
      </div>
    </div>
  );
}

function PaletteBody({ cards, collections, loadTabs, onSelect }) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [query, setQuery] = useState('');
  const [tabs, setTabs] = useState([]);
  const [activeKey, setActiveKey] = useState(null);

  // Open tabs are read when the palette opens (this component mounts per open).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => loadTabs?.())
      .then((rows) => {
        if (!cancelled && Array.isArray(rows)) setTabs(rows);
      })
      .catch((err) => logError('CommandPalette.loadTabs', err));
    return () => {
      cancelled = true;
    };
  }, [loadTabs]);

  const groups = useMemo(() => searchPalette(query, { cards, collections, tabs }), [query, cards, collections, tabs]);
  const flat = useMemo(() => flattenPalette(groups), [groups]);

  // Selection is tracked by item key so it survives the late tab load; when the
  // result set changes and the key is gone it falls back to the first row.
  const activeIndex = Math.max(0, flat.findIndex((item) => item.key === activeKey));
  const activeItem = flat[activeIndex] || null;
  const optionId = (item) => `${uid}-${item.key}`;

  const pick = useCallback(
    (item, event) => {
      if (!item) return;
      onSelect(item, { newTab: !!(event && (event.metaKey || event.ctrlKey)) });
    },
    [onSelect]
  );

  const move = (delta) => {
    if (flat.length === 0) return;
    const next = (activeIndex + delta + flat.length) % flat.length;
    setActiveKey(flat[next].key);
  };

  const onKeyDown = (event) => {
    // An IME (Chinese/Japanese) uses Enter and the arrows to pick candidates;
    // those must never reach the palette.
    if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Home':
        if (flat.length) {
          event.preventDefault();
          setActiveKey(flat[0].key);
        }
        break;
      case 'End':
        if (flat.length) {
          event.preventDefault();
          setActiveKey(flat[flat.length - 1].key);
        }
        break;
      case 'Enter':
        event.preventDefault();
        pick(activeItem, event);
        break;
      default:
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div data-command-palette="">
      <div className={INPUT_WRAP_CLASS}>
        <Search className="size-4 flex-shrink-0 text-faint" aria-hidden="true" />
        <Input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
          aria-label={t('cmdkPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          className={INPUT_CLASS}
          placeholder={t('cmdkPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <kbd className={KBD_CLASS}>esc</kbd>
      </div>

      <div id={listId} role="listbox" aria-label={t('cmdkListLabel')} className={LIST_CLASS}>
        {GROUPS.map(({ name, labelKey }) =>
          groups[name].length > 0 ? (
            <div key={name} role="group" aria-labelledby={`${uid}-${name}`} data-palette-group={name}>
              <div id={`${uid}-${name}`} className={GROUP_LABEL_CLASS}>
                {t(labelKey)}
              </div>
              {groups[name].map((item) => (
                <PaletteRow
                  key={item.key}
                  item={item}
                  id={optionId(item)}
                  active={activeItem?.key === item.key}
                  onHover={() => setActiveKey(item.key)}
                  onPick={pick}
                />
              ))}
            </div>
          ) : null
        )}

        {flat.length === 0 ? (
          <div role="presentation" data-palette-empty="" className="px-4 py-10 text-center">
            <div className="text-[12.5px] font-medium text-foreground">
              {hasQuery ? t('cmdkEmptyTitle') : t('cmdkIdleHint')}
            </div>
            {hasQuery ? <div className="mt-1 text-[11.5px] text-muted-foreground">{t('cmdkEmptyHint')}</div> : null}
          </div>
        ) : null}
      </div>

      <div className={FOOTER_CLASS}>
        <span className="flex items-center gap-1">
          <kbd className={KBD_CLASS}>↑↓</kbd>
          {t('cmdkHintNavigate')}
        </span>
        <span className="flex items-center gap-1">
          <kbd className={KBD_CLASS}>↵</kbd>
          {t('cmdkHintOpen')}
        </span>
        <span className="flex items-center gap-1">
          <kbd className={KBD_CLASS}>⌘/Ctrl ↵</kbd>
          {t('cmdkHintNewTab')}
        </span>
      </div>
    </div>
  );
}

/**
 * @param open         palette visibility (App owns it)
 * @param onClose      close request (Esc / outside click / after a pick)
 * @param cards        flat bookmarks with `collectionTitle` (`allCards`)
 * @param collections  `{id, title, cards}` (the active source's collections)
 * @param loadTabs     async () => open tabs `[{id, title, url}]`
 * @param onSelect     (item, { newTab }) => void; `item.type` is bookmark | collection | tab
 */
export function CommandPalette({ open, onClose, cards, collections, loadTabs, onSelect }) {
  const select = useCallback(
    (item, opts) => {
      onClose?.();
      onSelect?.(item, opts);
    },
    [onClose, onSelect]
  );

  return (
    <DialogShell open={open} onClose={onClose} title={t('cmdkTitle')} className={PANEL_CLASS}>
      <PaletteBody
        cards={cards || []}
        collections={collections || []}
        loadTabs={loadTabs}
        onSelect={select}
      />
    </DialogShell>
  );
}
