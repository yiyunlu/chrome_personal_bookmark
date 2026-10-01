import React, { useEffect, useMemo, useRef } from 'react';
import { BookmarkIcon } from './BookmarkIcon';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  GripVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import { t } from '../lib/i18n';
import { logError } from '../lib/utils';
import { generateTags } from '../lib/enrichmentService';
import { cn } from '../lib/cn';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// ── SortableJS contract (see SHADCN_MIGRATION.md, P5a / S3) ──────────────────
// `main.jsx` drives three Sortable scopes against this markup and, on drop,
// reverts Sortable's DOM mutation before React reconciles. Five things below are
// load-bearing and must not move — **in either view**:
//   1. `data-collection-id` + `data-draggable` sit on the <article>, which is a
//      DIRECT child of `[data-module-sortable]` (Sortable only sorts direct children).
//   2. `data-cards-collection-id` + `data-parent-id` sit on the same element, whose
//      children are exactly the cards, in order — `main.jsx` indexes
//      `evt.from.children[oldIndex]`, so a stray child there corrupts the revert.
//      In list view that element is ALSO the bordered list container: the border,
//      the radius hangs on the drag host itself rather than on
//      a wrapper, because a wrapper would either become the stray child or push the
//      rows a level down and break the same arithmetic.
//   3. `data-card-id` sits on the card/row root, a direct child of that container.
//   4. `.card-drag-handle` / `.collection-drag-handle` are the Sortable `handle:`
//      selectors, and `.card-mini-btn` / `.card-select` are read by
//      `handleCardClick` (main.jsx) to suppress the card-open click.
//   5. Nothing between the group header and the cards container may set
//      `overflow` — the header is `position: sticky` and an overflow ancestor
//      silently turns that into a no-op.
// `src/test/collectionCardDragHost.test.jsx` pins all of it, including depth, and
// compares the two views node for node.
// Card/Button are plain elements, so the data attributes go ON the shadcn element
// rather than on a wrapper around it.

const EMPTY_TAGS = [];

// Memoized: with hundreds of bookmarks, unrelated App state changes (toasts,
// chat, modals) must not re-render every card. All callback props are
// useCallback-stabilized in main.jsx.
export const BookmarkCard = React.memo(function BookmarkCard({
  card,
  view = 'grid',
  cardDragEnabled = true,
  manageMode,
  isSelected,
  onCardClick,
  onContextMenu,
  onEdit,
  onDelete,
  onToggleSelect,
  onTagClick
}) {
  let domain = '';
  try {
    domain = new URL(card.url).hostname.replace(/^www\./, '');
  } catch (err) {
    logError('BookmarkCard.domain', err);
  }

  // Tags belong to the list view only — the grid tile is two lines by design.
  const tags = useMemo(
    () =>
      view === 'list' ? generateTags({ url: card.url, title: card.title }).slice(0, 3) : EMPTY_TAGS,
    [view, card.url, card.title]
  );

  /* Drag handle — visible on hover. Sortable `handle:` selector. The design draws
     no handles because it is a static render and these only appear on hover.
     When card drag is disabled (search active / manage mode / sort ≠ manual,
     V2-A's isCardDragEnabled), the cursor drops to default rather than grab —
     nothing here would actually reorder. */
  const dragHandle = (
    <span
      className={cn(
        'card-drag-handle flex-shrink-0 opacity-0 group-hover:opacity-40',
        cardDragEnabled ? 'cursor-grab' : 'cursor-default'
      )}
    >
      <GripVertical size={16} />
    </span>
  );

  /* The native checkbox stays for a11y and click semantics (`.card-select`,
     `type="checkbox"`, `checked` — all read by existing tests and by
     handleCardClick in main.jsx); the design's 18px box + 10px Check glyph is
     a sibling visual that mirrors its checked state. */
  const selectBox = manageMode ? (
    <span className="relative flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center">
      <input
        type="checkbox"
        className="card-select absolute inset-0 h-full w-full cursor-pointer opacity-0"
        checked={isSelected}
        onChange={() => onToggleSelect(card.id)}
        onClick={(e) => e.stopPropagation()}
        aria-label={card.title}
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex h-[18px] w-[18px] items-center justify-center rounded-sm border transition-colors',
          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
        )}
      >
        {isSelected && <Check className="size-[10px]" />}
      </span>
    </span>
  ) : null;

  /* Manage actions. `.card-mini-btn` is read by handleCardClick in main.jsx. */
  const miniButtons = manageMode ? (
    <div className="flex flex-shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="card-mini-btn h-7 w-7 text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(card);
        }}
        aria-label={t('edit')}
        title={t('edit')}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="card-mini-btn h-7 w-7 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card);
        }}
        aria-label={t('delete')}
        title={t('delete')}
      >
        <Trash2 />
      </Button>
    </div>
  ) : null;

  if (view === 'list') {
    return (
      // A plain <div>, not <Card>: the surface, border and radius belong to the
      // list container; a row only carries a hairline and a hover colour. It is a
      // direct child of [data-cards-collection-id] exactly as the grid tile is.
      <div
        data-card-id={card.id}
        className={cn(
          // 36px row, 12px side padding, 10px gap — the design's list row.
          'group flex h-9 w-full cursor-pointer items-center gap-2.5 border-b border-border px-3 text-left',
          // The last row's hairline would double up against the container's own
          // bottom border. The end rows carry the container's radius themselves:
          // the container used to clip them with `overflow-hidden`, which also
          // clipped a row mid-drag at the container edge.
          'last:border-b-0 first:rounded-t-lg last:rounded-b-lg transition-colors hover:bg-secondary',
          isSelected && 'bg-primary/10'
        )}
        onClick={(e) => onCardClick(e, card)}
        onContextMenu={(e) => onContextMenu(e, card)}
        title={card.url}
      >
        {dragHandle}
        {selectBox}

        {/* 18px favicon tile (the design's letter block, keeping the real favicon). */}
        <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center overflow-hidden rounded-sm bg-secondary">
          <BookmarkIcon url={card.url} title={card.title} />
        </div>

        <div className="min-w-0 max-w-[42%] truncate text-[12.5px] font-medium text-foreground">
          {card.title}
        </div>
        <div className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-faint">
          {card.url}
        </div>

        {/* Tags, right-aligned. This is where onTagClick is used again. Badge is
            presentational (a plain div), so `role="button"` + `tabIndex` give it
            the same accessible identity a real control would have — and, since
            a plain div has no built-in activation keys, Enter and Space are
            wired up by hand (Space also gets preventDefault so it doesn't
            scroll the page, matching native activation behaviour). */}
        {tags.length > 0 && (
          <div className="flex flex-shrink-0 items-center gap-1">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                role="button"
                tabIndex={0}
                className="cursor-pointer text-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {miniButtons}
      </div>
    );
  }

  return (
    <Card
      data-card-id={card.id}
      className={cn(
        // No radius here on purpose: <Card> ships rounded-xl, which is the reference
        // app's card radius. Overriding it is what made these boxes look squarer.
        // The design's grid tile: 11px padding, 10px gap, top-aligned, and a hover
        // that changes surface and border rather than lifting the card.
        'group relative flex w-full cursor-pointer items-start gap-2.5 p-[11px] text-left shadow-none',
        'transition-colors hover:bg-secondary hover:border-input',
        isSelected && 'border-primary bg-primary/10'
      )}
      onClick={(e) => onCardClick(e, card)}
      onContextMenu={(e) => onContextMenu(e, card)}
      title={card.url}
    >
      {dragHandle}
      {selectBox}

      {/* Favicon. The design draws a flat tinted letter tile here; we keep the real
          favicon inside the same 22px container — BookmarkIcon already falls back
          on its own when every candidate fails. */}
      <div className="mt-px flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
        <BookmarkIcon url={card.url} title={card.title} />
      </div>

      {/* Two lines only, per the design: title, then the URL in mono. Tags are
          deliberately not rendered here — they belong to the list view. */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium leading-[1.35] text-foreground">{card.title}</div>
        {domain && (
          <div className="mt-[3px] truncate font-mono text-[10.5px] text-faint">{domain}</div>
        )}
      </div>

      {miniButtons}
    </Card>
  );
});

export const CollectionCard = React.memo(function CollectionCard({
  collection,
  collapsed,
  view = 'grid',
  moduleDraggable,
  cardDragEnabled,
  manageMode,
  selectedCardIds,
  onToggleCollapse,
  onCardClick,
  onCardContextMenu,
  onCollectionContextMenu,
  onEditCard,
  onDeleteCard,
  onToggleCardSelect,
  onOpenAll,
  onTagClick
}) {
  const headerRef = useRef(null);

  // Capture-phase native listener: React's bubble onContextMenu + preventDefault
  // was not enough to suppress Chrome's page menu on Unfiled in extension pages.
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;
    const onContextMenu = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onCollectionContextMenu?.(event, collection);
    };
    node.addEventListener('contextmenu', onContextMenu, true);
    return () => node.removeEventListener('contextmenu', onContextMenu, true);
  }, [collection, onCollectionContextMenu]);

  return (
    // Not a shadcn <Card>: this is the `[data-module-sortable]` drag host and the
    // design gives a group no panel of its own — a sticky header on the page
    // background, then the grid or the list. It keeps its <article> tag.
    // It must NOT set `overflow`: that would kill the sticky header inside it.
    <article data-collection-id={collection.id} data-draggable={String(moduleDraggable)}>
      {/* Sticky group header. Right-click anywhere on the row opens the collection
          menu. `z-[2]` is the design's own stacking value; the header has to clear
          the cards that scroll under it and nothing else. */}
      <div
        ref={headerRef}
        className="group sticky top-0 z-[2] flex w-full items-center gap-2 border-b border-border bg-background pt-3 pb-[9px]"
      >
        <span
          className={cn(
            'collection-drag-handle flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40',
            !moduleDraggable && 'invisible'
          )}
        >
          <GripVertical size={16} />
        </span>
        {/* The heading wraps the control (the standard disclosure pattern) rather
            than sitting inside it: <h2> is not phrasing content and may not live
            inside a button element. (Spelling that out rather than showing the
            tag: gate 12 counts the literal, and this file must stay at zero.) */}
        <h2 className="flex min-w-0 flex-1">
          <Button
            type="button"
            variant="ghost"
            // `-mt-3 -mb-[9px] pt-3 pb-[9px]` puts the header's vertical padding back
            // inside the button's box. Without it the header's top/bottom strip
            // stopped toggling the collection, which the baseline's whole-row native
            // control used to cover. `hover:bg-transparent` is deliberate parity, not
            // an oversight: that baseline control had no hover style at all.
            // `py-0` is not redundant: resolving this string through cn() shows the
            // cva's own `py-2` survives `pt-3 pb-[9px]` (different conflict groups),
            // which would leave two rules fighting on stylesheet order. `py-0`
            // displaces it, and Tailwind emits `pt-*`/`pb-*` after `py-*`.
            // `[&_svg]:size-[13px]` restates the design's glyph size: inside a
            // <Button> the cva's own `[&_svg]:size-4` is a class and beats any
            // size prop on the icon itself (Style contract, "Icons").
            className="-mt-3 -mb-[9px] h-auto w-full justify-start gap-[9px] px-0 py-0 pt-3 pb-[9px] text-left font-normal hover:bg-transparent [&_svg]:size-[13px]"
            onClick={() => onToggleCollapse(collection.id)}
          >
            <FolderOpen className="text-faint" />
            <span className="truncate text-[12.5px] font-semibold tracking-[0.01em]">
              {collection.title}
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] tabular-nums text-faint">
              {collection.cards.length}
            </Badge>
            <span className="flex-1" />
          </Button>
        </h2>
        {collection.cards.length > 0 && onOpenAll && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            // hover:text-primary restated: ghost's hover:text-accent-foreground is a separate
            // merge group and would repaint this glyph near-black under the pointer.
            className="h-[26px] w-[26px] flex-shrink-0 rounded-md text-primary hover:text-primary opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
            aria-label={t('openAllTabs')}
            title={t('openAllTabs')}
            onClick={(e) => {
              e.stopPropagation();
              onOpenAll(collection.id);
            }}
          >
            <ExternalLink />
          </Button>
        )}
        {/* 26px collapse chevron, restyled ghost control (V2-C). */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[26px] w-[26px] flex-shrink-0 rounded-md text-faint hover:bg-secondary hover:text-foreground"
          aria-label={collapsed ? t('expandCollection') : t('collapseCollection')}
          title={collapsed ? t('expandCollection') : t('collapseCollection')}
          aria-expanded={!collapsed}
          onClick={() => onToggleCollapse(collection.id)}
        >
          {collapsed ? <ChevronRight /> : <ChevronDown />}
        </Button>
      </div>

      {/* Cards. The drag host is the same node in all three shapes below. */}
      {!collapsed &&
        (collection.cards.length === 0 ? (
          <div
            data-cards-collection-id={collection.id}
            data-parent-id={collection.id}
            className="mt-3 mb-[26px] flex items-center justify-center rounded-lg border-2 border-dashed border-border py-6 text-[12.5px] text-faint"
          >
            {t('dragHere')}
          </div>
        ) : view === 'list' ? (
          <div
            data-cards-collection-id={collection.id}
            data-parent-id={collection.id}
            className="mt-3 mb-[26px] flex flex-col rounded-lg border border-border bg-card"
          >
            {collection.cards.map((card) => (
              <BookmarkCard
                key={card.id}
                card={card}
                view="list"
                cardDragEnabled={cardDragEnabled}
                manageMode={manageMode}
                isSelected={selectedCardIds.has(card.id)}
                onCardClick={onCardClick}
                onContextMenu={onCardContextMenu}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onToggleSelect={onToggleCardSelect}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        ) : (
          <div
            data-cards-collection-id={collection.id}
            data-parent-id={collection.id}
            className="mt-3 mb-[26px] grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-[9px]"
          >
            {collection.cards.map((card) => (
              <BookmarkCard
                key={card.id}
                card={card}
                view="grid"
                cardDragEnabled={cardDragEnabled}
                manageMode={manageMode}
                isSelected={selectedCardIds.has(card.id)}
                onCardClick={onCardClick}
                onContextMenu={onCardContextMenu}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onToggleSelect={onToggleCardSelect}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        ))}
    </article>
  );
});
