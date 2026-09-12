import React, { useMemo } from 'react';
import { BookmarkIcon } from './BookmarkIcon';
import { ChevronDown, ChevronRight, ExternalLink, FolderOpen, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { t } from '../lib/i18n';
import { logError } from '../lib/utils';
import { generateTags } from '../lib/enrichmentService';
import { cn } from '../lib/cn';
import { Button } from './ui/button';
import { Card } from './ui/card';

// ── SortableJS contract (see SHADCN_MIGRATION.md, P5a) ───────────────────────
// `main.jsx` drives three Sortable scopes against this markup and, on drop,
// reverts Sortable's DOM mutation before React reconciles. Four things below are
// load-bearing and must not move:
//   1. `data-collection-id` + `data-draggable` sit on the <article>, which is a
//      DIRECT child of `[data-module-sortable]` (Sortable only sorts direct children).
//   2. `data-cards-collection-id` + `data-parent-id` sit on the same element, whose
//      children are exactly the cards, in order — `main.jsx` indexes
//      `evt.from.children[oldIndex]`, so a stray child there corrupts the revert.
//   3. `data-card-id` sits on the card root, a direct child of that container.
//   4. `.card-drag-handle` / `.collection-drag-handle` are the Sortable `handle:`
//      selectors, and `.card-mini-btn` / `.card-select` are read by
//      `handleCardClick` (main.jsx) to suppress the card-open click.
// `src/test/collectionCardDragHost.test.jsx` pins all of it, including depth.
// Card/Button are plain elements, so the data attributes go ON the shadcn element
// rather than on a wrapper around it.

// Memoized: with hundreds of bookmarks, unrelated App state changes (toasts,
// chat, modals) must not re-render every card. All callback props are
// useCallback-stabilized in main.jsx.
export const BookmarkCard = React.memo(function BookmarkCard({
  card,
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

  const tags = useMemo(
    () => generateTags({ url: card.url, title: card.title }).slice(0, 3),
    [card.url, card.title]
  );

  return (
    <Card
      data-card-id={card.id}
      className={cn(
        'group relative flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left shadow-none',
        isSelected && 'border-primary bg-accent'
      )}
      onClick={(e) => onCardClick(e, card)}
      onContextMenu={(e) => onContextMenu(e, card)}
      title={card.url}
    >
      {/* Drag handle — visible on hover. Sortable `handle:` selector. */}
      <span className="card-drag-handle flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40">
        <GripVertical size={16} />
      </span>

      {manageMode && (
        <input
          type="checkbox"
          className="card-select h-4 w-4 flex-shrink-0 rounded-md accent-primary"
          checked={isSelected}
          onChange={() => onToggleSelect(card.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={card.title}
        />
      )}

      {/* Favicon */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent">
        <BookmarkIcon url={card.url} title={card.title} />
      </div>

      {/* Title + domain + tags */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{card.title}</div>
        {domain && <div className="mt-0.5 truncate text-xs text-muted-foreground">{domain}</div>}
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto rounded-full bg-accent px-1.5 py-0.5 text-xs font-normal text-primary hover:bg-accent hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
              >
                {tag}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Manage actions. `.card-mini-btn` is read by handleCardClick in main.jsx. */}
      {manageMode && (
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
      )}
    </Card>
  );
});

export const CollectionCard = React.memo(function CollectionCard({
  collection,
  collapsed,
  moduleDraggable,
  cardDragEnabled: _cardDragEnabled,
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
  return (
    // Not a shadcn <Card>: Card renders a <div> and has no `asChild`, and this is
    // the `[data-module-sortable]` drag host. It keeps its <article> tag and its
    // Card token classes by hand rather than swapping the host's element type.
    <article
      className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-panel"
      data-collection-id={collection.id}
      data-draggable={String(moduleDraggable)}
    >
      {/* Header. Right-click anywhere on the row opens the collection menu. */}
      <div
        className="group flex w-full items-center gap-2 px-4 py-3"
        onContextMenu={(e) => onCollectionContextMenu?.(e, collection)}
      >
        <span
          className={cn(
            'collection-drag-handle flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40',
            !moduleDraggable && 'invisible'
          )}
        >
          <GripVertical size={16} />
        </span>
        <Button
          type="button"
          variant="ghost"
          // `-my-3 py-3` puts the row's vertical padding back inside the button's
          // box. Without it the header's 12px top/bottom strip stopped toggling
          // the collection, which the baseline's whole-row native control used to
          // cover. `hover:bg-transparent` is deliberate parity, not an oversight:
          // that baseline control had no hover style at all.
          className="-my-3 h-auto flex-1 justify-start gap-2 px-0 py-3 text-left font-normal hover:bg-transparent"
          onClick={() => onToggleCollapse(collection.id)}
        >
          <FolderOpen className="text-primary" />
          <span className="flex-1 truncate text-sm font-semibold">{collection.title}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{collection.cards.length}</span>
          {collapsed ? (
            <ChevronRight className="text-muted-foreground" />
          ) : (
            <ChevronDown className="text-muted-foreground" />
          )}
        </Button>
        {collection.cards.length > 0 && onOpenAll && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
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
      </div>

      {/* Cards grid */}
      {!collapsed && (
        <div className="min-h-10 px-3 pb-3">
          {collection.cards.length === 0 ? (
            <div
              data-cards-collection-id={collection.id}
              data-parent-id={collection.id}
              className="flex items-center justify-center rounded-lg border-2 border-dashed border-border py-6 text-sm text-muted-foreground"
            >
              {t('dragHere')}
            </div>
          ) : (
            <div
              data-cards-collection-id={collection.id}
              data-parent-id={collection.id}
              className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3"
            >
              {collection.cards.map((card) => (
                <BookmarkCard
                  key={card.id}
                  card={card}
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
          )}
        </div>
      )}
    </article>
  );
});
