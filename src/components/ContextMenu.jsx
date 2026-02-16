import React, { useRef, useEffect, useState } from 'react';
import { t } from '../lib/i18n';

export default function ContextMenu({
    contextMenu,
    onEditCard,
    onDeleteCard,
    onRenameCollection,
    onDeleteCollection
}) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!contextMenu) return;
        const el = menuRef.current;
        if (!el) {
            setPosition({ top: contextMenu.y, left: contextMenu.x });
            return;
        }
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const top = contextMenu.y + rect.height > vh ? Math.max(0, vh - rect.height - 4) : contextMenu.y;
        const left = contextMenu.x + rect.width > vw ? Math.max(0, vw - rect.width - 4) : contextMenu.x;
        setPosition({ top, left });
    }, [contextMenu]);

    if (!contextMenu) return null;

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ top: position.top, left: position.left }}
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
