import React, { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { t } from '../lib/i18n';
import { DialogShell } from './DialogShell';
import { BookmarkIcon } from './BookmarkIcon';

const NEW_COLLECTION_VALUE = '__new__';

export function SaveTabsModal({ open, tabs, defaultFolderName, collections, onSave, onClose }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set((tabs || []).map((tab) => tab.id)));
  const [folderName, setFolderName] = useState(defaultFolderName || '');
  const [targetId, setTargetId] = useState(NEW_COLLECTION_VALUE);
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens with new tabs
  React.useEffect(() => {
    if (tabs && tabs.length > 0) {
      setSelectedIds(new Set(tabs.map((tab) => tab.id)));
      setFolderName(defaultFolderName || '');
      setTargetId(NEW_COLLECTION_VALUE);
    }
  }, [tabs, defaultFolderName]);

  const allSelected = useMemo(
    () => tabs && tabs.length > 0 && selectedIds.size === tabs.length,
    [tabs, selectedIds]
  );

  const toggleAll = useCallback(() => {
    if (!tabs) return;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tabs.map((tab) => tab.id)));
    }
  }, [tabs, allSelected]);

  const toggleTab = useCallback((tabId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) {
        next.delete(tabId);
      } else {
        next.add(tabId);
      }
      return next;
    });
  }, []);

  const getDomain = useCallback((url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saving || selectedIds.size === 0) return;
    setSaving(true);
    try {
      await onSave({
        selectedTabIds: selectedIds,
        folderName,
        targetCollectionId: targetId === NEW_COLLECTION_VALUE ? null : targetId
      });
    } finally {
      setSaving(false);
    }
  }, [saving, selectedIds, folderName, targetId, onSave]);

  if (!open || !tabs) return null;

  return (
    <DialogShell open={open} onClose={onClose} title={t('saveTabsTitle')} className="max-w-xl">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: 'var(--panel-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {t('saveTabsTitle')}
        </h2>
        <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: 'var(--muted)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Folder name */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            {t('folderName')}
          </label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder={t('folderName')}
          />
        </div>

        {/* Target collection */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            {t('targetCollection')}
          </label>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value={NEW_COLLECTION_VALUE}>{t('newCollectionOption')}</option>
            {(collections || []).map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>
        </div>

        {/* Select all / Deselect all + count */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium px-2 py-1 rounded-md"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            {allSelected ? t('deselectAll') : t('selectAll')}
          </button>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {t('tabsSelected', selectedIds.size)}
          </span>
        </div>

        {/* Tab checklist */}
        <div
          className="max-h-64 overflow-y-auto rounded-lg border p-1"
          style={{ borderColor: 'var(--panel-border)', background: 'var(--input-bg)' }}
        >
          {tabs.map((tab) => (
            <label
              key={tab.id}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 cursor-pointer text-sm hover:opacity-80"
              style={{
                background: selectedIds.has(tab.id) ? 'var(--accent-soft)' : 'transparent'
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(tab.id)}
                onChange={() => toggleTab(tab.id)}
                className="rounded"
                style={{ accentColor: 'var(--accent)' }}
              />
              <BookmarkIcon url={tab.url} title={tab.title} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: 'var(--text)' }}>
                  {tab.title}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {getDomain(tab.url)}
                </div>
              </div>
            </label>
          ))}
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
          onClick={handleSave}
          disabled={saving || selectedIds.size === 0}
          className="px-3.5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
        >
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </DialogShell>
  );
}
