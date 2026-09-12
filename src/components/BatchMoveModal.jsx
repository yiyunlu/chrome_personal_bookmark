import React from 'react';
import { FolderOpen, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '../lib/i18n';
import { DialogShell } from './DialogShell';

// See EditBookmarkModal: keeps the dialog field look over shadcn's Input base.
const FIELD_CLASS =
  'h-auto w-full rounded-lg px-3 py-2 text-sm shadow-none ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

export function BatchMoveModal({ batchMoveState, setBatchMoveState, filteredTargets, selectedCount, onSave, onClose }) {
  return (
    <DialogShell open={!!batchMoveState} onClose={onClose} title={t('batchMoveTitle', selectedCount)}>
      {batchMoveState && (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {t('batchMoveTitle', selectedCount)}
            </h2>
            <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: 'var(--muted)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <Label htmlFor="tabhub-batch-folder" className="block text-xs leading-normal mb-1" style={{ color: 'var(--muted)' }}>
              {t('selectTargetFolder')}
            </Label>
            <Input
              id="tabhub-batch-folder"
              className={FIELD_CLASS}
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              placeholder={t('searchFolder')}
              value={batchMoveState.folderQuery}
              onChange={(e) => setBatchMoveState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))}
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
                    background: batchMoveState.targetParentId === collection.id ? 'var(--accent-soft)' : 'transparent',
                    color: batchMoveState.targetParentId === collection.id ? 'var(--accent)' : 'var(--text)'
                  }}
                  onClick={() => setBatchMoveState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))}
                >
                  <FolderOpen size={14} style={{ opacity: 0.6 }} />
                  <span className="truncate">{collection.title}</span>
                </button>
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
              onClick={onSave}
              disabled={batchMoveState.moving || !batchMoveState.targetParentId || selectedCount === 0}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
            >
              {batchMoveState.moving ? t('moving') : t('batchMove')}
            </button>
          </div>
        </>
      )}
    </DialogShell>
  );
}
