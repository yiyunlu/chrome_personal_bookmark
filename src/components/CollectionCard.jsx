import React from 'react';
import { BookmarkIcon } from './BookmarkIcon';

export function BookmarkCard({ card, manageMode, isSelected, onCardClick, onContextMenu, onEdit, onDelete, onToggleSelect }) {
  return (
    <div
      data-card-id={card.id}
      className={`bookmark-card ${isSelected ? 'bookmark-card-selected' : ''}`}
      onClick={(e) => onCardClick(e, card)}
      onContextMenu={(e) => onContextMenu(e, card)}
      title={card.url}
    >
      <span className="card-drag-handle" aria-hidden="true">⋮⋮</span>
      {manageMode && (
        <input
          type="checkbox"
          className="card-select"
          checked={isSelected}
          onChange={() => onToggleSelect(card.id)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <BookmarkIcon url={card.url} title={card.title} />
      <span className="truncate text-sm font-medium">{card.title}</span>
      {manageMode && (
        <div className="card-manage-actions">
          <button
            type="button"
            className="card-mini-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
          >
            编辑
          </button>
          <button
            type="button"
            className="card-mini-btn card-mini-btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card);
            }}
          >
            删除
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
  cardDragEnabled,
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
      className="collection-card"
      data-collection-id={collection.id}
      data-draggable={String(moduleDraggable)}
    >
      <button
        className="collection-header"
        onClick={() => onToggleCollapse(collection.id)}
        type="button"
      >
        <span className="collection-header-left">
          <span className="collection-drag-handle" aria-hidden="true">⋮⋮</span>
          <span className="font-semibold">{collection.title}</span>
        </span>
        <span className="text-xs opacity-70">{collection.cards.length} items {collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div
          data-cards-collection-id={collection.id}
          data-parent-id={collection.id}
          className={`collection-grid collection-drop-zone p-1 ${!cardDragEnabled ? 'opacity-80' : ''}`}
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
            />
          ))}
        </div>
      )}
    </article>
  );
}
