import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import { t } from '../lib/i18n';

export function EditBookmarkModal({ editorState, setEditorState, filteredTargets, onSave, onClose }) {
  if (!editorState) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden animate-slide-up"
        style={{
          background: 'var(--panel-bg)',
          borderColor: 'var(--panel-border)',
          boxShadow: 'var(--shadow)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {t('editBookmark')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              {t('titleLabel')}
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              value={editorState.title}
              onChange={(e) => setEditorState((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              URL
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              value={editorState.url}
              onChange={(e) => setEditorState((prev) => (prev ? { ...prev, url: e.target.value } : prev))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
              {t('moveToFolder')}
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              placeholder={t('searchFolder')}
              value={editorState.folderQuery}
              onChange={(e) => setEditorState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))}
            />
            <div
              className="mt-2 max-h-48 overflow-y-auto rounded-lg border p-1"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--input-bg)' }}
            >
              {filteredTargets.map((collection) => (
                <button
                  type="button"
                  key={collection.id}
                  className="w-full flex items-center gap-2 text-left rounded-md px-2.5 py-1.5 text-sm"
                  style={{
                    background: editorState.targetParentId === collection.id ? 'var(--accent-soft)' : 'transparent',
                    color: editorState.targetParentId === collection.id ? 'var(--accent)' : 'var(--text)'
                  }}
                  onClick={() => setEditorState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))}
                >
                  <FolderOpen size={14} style={{ opacity: 0.6 }} />
                  <span className="truncate">{collection.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border text-sm"
            style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={editorState.saving}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
          >
            {editorState.saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
