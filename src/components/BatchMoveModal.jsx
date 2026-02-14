import React, { useMemo } from 'react';
import { t } from '../lib/i18n';

export default function BatchMoveModal({
    batchMoveState,
    setBatchMoveState,
    selectedCards,
    collections,
    onSave,
    onClose
}) {
    if (!batchMoveState) return null;

    const filteredTargets = useMemo(() => {
        const keyword = batchMoveState.folderQuery.trim().toLowerCase();
        if (!keyword) return collections;
        return collections.filter((c) => c.title.toLowerCase().includes(keyword));
    }, [batchMoveState.folderQuery, collections]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-title">{t('batchMoveTitle', selectedCards.length)}</div>
                <div className="modal-body">
                    <label className="control-label">{t('searchTargetFolder')}</label>
                    <input
                        className="input-control"
                        placeholder={t('searchFolder')}
                        value={batchMoveState.folderQuery}
                        onChange={(e) =>
                            setBatchMoveState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))
                        }
                    />
                    <div className="folder-list">
                        {filteredTargets.map((collection) => (
                            <button
                                type="button"
                                key={collection.id}
                                className={`folder-item ${batchMoveState.targetParentId === collection.id ? 'folder-item-active' : ''}`}
                                onClick={() =>
                                    setBatchMoveState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))
                                }
                            >
                                {collection.title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="modal-actions">
                    <button type="button" className="secondary-btn" onClick={onClose}>
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        className="primary-btn"
                        onClick={onSave}
                        disabled={batchMoveState.moving || !batchMoveState.targetParentId || selectedCards.length === 0}
                    >
                        {batchMoveState.moving ? t('moving') : t('batchMove')}
                    </button>
                </div>
            </div>
        </div>
    );
}
