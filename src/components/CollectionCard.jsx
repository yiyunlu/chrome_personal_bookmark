import React from 'react';
import { BookmarkIcon } from './BookmarkIcon';
import { ChevronDown, ChevronRight, FolderOpen, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { t } from '../lib/i18n';

export function BookmarkCard({
  card,
  manageMode,
  isSelected,
  onCardClick,
  onContextMenu,
  onEdit,
  onDelete,
  onToggleSelect
}) {
  let domain = '';
  try {
    domain = new URL(card.url).hostname.replace(/^www\./, '');
  } catch {}

  return (
    <div
      data-card-id={card.id}
      className="group relative flex items-center gap-3 w-full rounded-xl border p-3 text-left cursor-pointer"
      style={{
        background: isSelected ? 'var(--accent-soft)' : 'var(--card-bg)',
        borderColor: isSelected ? 'var(--accent)' : 'var(--card-border)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--hover)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = 'var(--shadow)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isSelected ? 'var(--accent-soft)' : 'var(--card-bg)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={(e) => onCardClick(e, card)}
      onContextMenu={(e) => onContextMenu(e, card)}
      title={card.url}
    >
      {/* Drag handle — visible on hover */}
      <span className="card-drag-handle flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab">
        <GripVertical size={14} />
      </span>

      {manageMode && (
        <input
          type="checkbox"
          className="card-select flex-shrink-0 w-4 h-4 rounded accent-[var(--accent)]"
          checked={isSelected}
          onChange={() => onToggleSelect(card.id)}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Favicon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--accent-soft)' }}
      >
        <BookmarkIcon url={card.url} title={card.title} />
      </div>

      {/* Title + domain */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {card.title}
        </div>
        {domain && (
          <div className="text-[0.7rem] truncate mt-0.5" style={{ color: 'var(--muted)' }}>
            {domain}
          </div>
        )}
      </div>

      {/* Manage actions */}
      {manageMode && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="card-mini-btn p-1 rounded-md hover:opacity-80"
            style={{ color: 'var(--muted)' }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
            title={t('edit')}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="card-mini-btn p-1 rounded-md hover:opacity-80"
            style={{ color: 'var(--danger)' }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card);
            }}
            title={t('delete')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export function CollectionCard({
  collection,
  collapsed,
  moduleDraggable,
  cardDragEnabled: _cardDragEnabled,
  manageMode,
  selectedCardIds,
  onToggleCollapse,
  onCardClick,
  onCardContextMenu,
  onEditCard,
  onDeleteCard,
  onToggleCardSelect
}) {
  return (
    <article
      className="rounded-2xl border overflow-hidden"
      data-collection-id={collection.id}
      data-draggable={String(moduleDraggable)}
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        boxShadow: 'var(--shadow)'
      }}
    >
      {/* Header */}
      <button
        className="group w-full flex items-center gap-2 px-4 py-3 text-left"
        onClick={() => onToggleCollapse(collection.id)}
        type="button"
        style={{ color: 'var(--text)' }}
      >
        <span
          className="collection-drag-handle flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab"
          style={{ visibility: moduleDraggable ? 'visible' : 'hidden' }}
        >
          <GripVertical size={15} />
        </span>
        <FolderOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span className="font-semibold text-sm flex-1 truncate">{collection.title}</span>
        <span className="text-[0.7rem] tabular-nums mr-1" style={{ color: 'var(--muted)' }}>
          {collection.cards.length}
        </span>
        {collapsed ? (
          <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
        ) : (
          <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
        )}
      </button>

      {/* Cards grid */}
      {!collapsed && (
        <div
          data-cards-collection-id={collection.id}
          data-parent-id={collection.id}
          className="px-3 pb-3"
          style={{ minHeight: '2.5rem' }}
        >
          {collection.cards.length === 0 ? (
            <div
              className="flex items-center justify-center py-6 rounded-xl border-2 border-dashed text-sm"
              style={{ borderColor: 'var(--panel-border)', color: 'var(--muted)' }}
            >
              {t('dragHere')}
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
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
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
