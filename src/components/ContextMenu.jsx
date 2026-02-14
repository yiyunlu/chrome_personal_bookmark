import React from 'react';
import { t } from '../lib/i18n';

export default function ContextMenu({
    contextMenu,
    onEditCard,
    onDeleteCard,
    onRenameCollection,
    onDeleteCollection
}) {
    if (!contextMenu) return null;

    return (
        <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
        >
            {contextMenu.kind === 'card' && (
                <>
                    <button type="button" className="context-item" onClick={onEditCard}>
                        {t('editBookmarkWithFolder')}
                    </button>
                    <button type="button" className="context-item context-item-danger" onClick={onDeleteCard}>
                        {t('deleteToTrash')}
                    </button>
                </>
            )}
            {contextMenu.kind === 'collection' && (
                <>
                    <button type="button" className="context-item" onClick={onRenameCollection}>
                        {t('renameFolder')}
                    </button>
                    <button
                        type="button"
                        className="context-item context-item-danger"
                        onClick={onDeleteCollection}
                    >
                        {t('deleteFolder')}
                    </button>
                </>
            )}
        </div>
    );
}
