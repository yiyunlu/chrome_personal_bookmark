import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, HelpCircle, Trash2, X } from 'lucide-react';
import { t } from '../lib/i18n';
import { Modal } from './Modal';

export function DeadLinkModal({ deadLinkState, onDeleteBookmark, onClose }) {
  const open = !!deadLinkState;
  const { loading, progress, results, error } = deadLinkState || {};
  const deadLinks = (results || []).filter((r) => r.linkStatus === 'dead');
  const unknownLinks = (results || []).filter((r) => r.linkStatus === 'unknown');
  const aliveCount = (results || []).filter((r) => r.alive).length;
  const hasProblems = deadLinks.length > 0 || unknownLinks.length > 0;

  return (
    <Modal open={open} onClose={onClose} title={t('deadLinkTitle')} className="max-w-xl">
      {deadLinkState && (
        <>
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {t('deadLinkTitle')}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: 'var(--muted)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  {t('deadLinkChecking')} {progress ? t('deadLinkProgress', progress.checked, progress.total) : ''}
                </span>
                {progress && (
                  <div className="w-full max-w-xs rounded-full h-1.5" style={{ background: 'var(--input-bg)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(progress.checked / progress.total) * 100}%`,
                        background: 'var(--accent)'
                      }}
                    />
                  </div>
                )}
              </div>
            ) : error ? (
              <div className="py-6 text-center">
                <div className="text-sm" style={{ color: 'var(--danger)' }}>
                  {error}
                </div>
              </div>
            ) : !hasProblems ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <CheckCircle size={32} style={{ color: 'var(--accent)' }} />
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('deadLinkAllGood')}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {t('deadLinkAllGoodDetail', aliveCount)}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {t('deadLinkFound', deadLinks.length + unknownLinks.length, (results || []).length)}
                </div>

                {/* Confirmed dead links */}
                {deadLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                      <AlertTriangle size={12} />
                      {t('deadLinkConfirmed')} ({deadLinks.length})
                    </div>
                    {deadLinks.map((item) => (
                      <DeadLinkItem
                        key={item.bookmarkId}
                        item={item}
                        variant="dead"
                        onDelete={onDeleteBookmark}
                      />
                    ))}
                  </div>
                )}

                {/* Unknown / unverifiable links */}
                {unknownLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--warning)' }}>
                      <HelpCircle size={12} />
                      {t('deadLinkUnknown')} ({unknownLinks.length})
                    </div>
                    {unknownLinks.map((item) => (
                      <DeadLinkItem
                        key={item.bookmarkId}
                        item={item}
                        variant="unknown"
                        onDelete={onDeleteBookmark}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-5 py-3 border-t" style={{ borderColor: 'var(--panel-border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border text-sm"
              style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
            >
              {t('close')}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function DeadLinkItem({ item, variant, onDelete }) {
  const isDead = variant === 'dead';
  const iconColor = isDead ? 'var(--danger)' : 'var(--warning)';
  const Icon = isDead ? AlertTriangle : HelpCircle;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-3 py-2.5"
      style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
    >
      <Icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: iconColor }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {item.title}
        </div>
        <div className="text-xs truncate mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
          <ExternalLink size={10} />
          <span className="truncate">{item.url}</span>
        </div>
        {item.error && (
          <div className="text-xs mt-0.5" style={{ color: iconColor }}>
            {item.error}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(item.bookmarkId, item.title)}
        className="flex-shrink-0 p-1 rounded-md hover:opacity-80"
        style={{ color: 'var(--danger)' }}
        title={t('deadLinkDeleteTitle')}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
