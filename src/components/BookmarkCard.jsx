import React from 'react';
import BookmarkIcon from './BookmarkIcon';
import { t } from '../lib/i18n';

export default function BookmarkCard({
    card,
    selected,
    manageMode,
    onCardClick,
    onContextMenu,
    onToggleSelect,
    onEdit,
    onDelete
}) {
    return (
        <div
            data-card-id={card.id}
            className={`bookmark-card ${selected ? 'bookmark-card-selected' : ''}`}
            onClick={onCardClick}
            onContextMenu={onContextMenu}
            title={card.url}
        >
            <span className="card-drag-handle" aria-hidden="true">⋮⋮</span>
            {manageMode && (
                <input
                    type="checkbox"
                    className="card-select"
                    checked={selected}
                    onChange={onToggleSelect}
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
                            onEdit();
                        }}
                    >
                        {t('edit')}
                    </button>
                    <button
                        type="button"
                        className="card-mini-btn card-mini-btn-danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        {t('delete')}
                    </button>
                </div>
            )}
        </div>
    );
}
