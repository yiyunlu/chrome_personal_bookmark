import React from 'react';
import { t } from '../lib/i18n';

export default function UndoToast({ toast, onUndo }) {
    if (!toast) return null;

    return (
        <div className="undo-toast">
            <span>{toast.message}</span>
            <button type="button" className="undo-btn" onClick={onUndo}>
                {toast.pending ? t('undoing') : t('undo')}
            </button>
        </div>
    );
}
