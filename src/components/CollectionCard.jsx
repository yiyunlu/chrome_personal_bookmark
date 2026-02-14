import React from 'react';
import BookmarkCard from './BookmarkCard';
import { t } from '../lib/i18n';

export default function CollectionCard({
    collection,
    collapsed,
    moduleDraggable,
    selectedCardIds,
    manageMode,
    cardDragEnabled,
    onToggleCollapse,
    onCardClick,
    onCardContextMenu,
    onToggleCardSelect,
    onEditCard,
    onDeleteCard
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
                <span className="text-xs opacity-70">
                    {collection.cards.length} {t('items')} {collapsed ? '▸' : '▾'}
                </span>
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
                            selected={selectedCardIds.has(card.id)}
                            manageMode={manageMode}
                            onCardClick={(e) => onCardClick(e, card)}
                            onContextMenu={(e) => onCardContextMenu(e, card)}
                            onToggleSelect={() => onToggleCardSelect(card.id)}
                            onEdit={() => onEditCard(card)}
                            onDelete={() => onDeleteCard(card)}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}
