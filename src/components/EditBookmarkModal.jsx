import React, { useMemo } from 'react';
import { t } from '../lib/i18n';

export default function EditBookmarkModal({
    editorState,
    setEditorState,
    collections,
    onSave,
    onClose
}) {
    if (!editorState) return null;

    const filteredTargets = useMemo(() => {
        const keyword = editorState.folderQuery.trim().toLowerCase();
        if (!keyword) return collections;
        return collections.filter((c) => c.title.toLowerCase().includes(keyword));
    }, [editorState.folderQuery, collections]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-title">{t('editBookmark')}</div>
                <div className="modal-body">
                    <label className="control-label">{t('titleLabel')}</label>
                    <input
                        className="input-control"
                        value={editorState.title}
                        onChange={(e) =>
                            setEditorState((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                        }
                    />
                    <label className="control-label mt-3">{t('urlLabel')}</label>
                    <input
                        className="input-control"
                        value={editorState.url}
                        onChange={(e) =>
                            setEditorState((prev) => (prev ? { ...prev, url: e.target.value } : prev))
                        }
                    />
                    <label className="control-label mt-3">{t('moveToFolder')}</label>
                    <input
                        className="input-control"
                        placeholder={t('searchFolder')}
                        value={editorState.folderQuery}
                        onChange={(e) =>
                            setEditorState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))
                        }
                    />
                    <div className="folder-list">
                        {filteredTargets.map((collection) => (
                            <button
                                type="button"
                                key={collection.id}
                                className={`folder-item ${editorState.targetParentId === collection.id ? 'folder-item-active' : ''}`}
                                onClick={() =>
                                    setEditorState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))
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
                        disabled={editorState.saving}
                    >
                        {editorState.saving ? t('saving') : t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
