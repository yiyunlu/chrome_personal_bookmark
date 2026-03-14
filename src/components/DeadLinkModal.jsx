import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, Trash2, X } from 'lucide-react';

export function DeadLinkModal({ deadLinkState, onDeleteBookmark, onClose }) {
  if (!deadLinkState) return null;

  const { loading, progress, results, error } = deadLinkState;
  const deadLinks = (results || []).filter((r) => !r.alive);
  const aliveCount = (results || []).filter((r) => r.alive).length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border overflow-hidden animate-slide-up"
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
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              失效链接检测
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
                正在检测链接… {progress ? `${progress.checked}/${progress.total}` : ''}
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
          ) : deadLinks.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <CheckCircle size={32} style={{ color: 'var(--accent)' }} />
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                所有链接均有效
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                已检测 {aliveCount} 个书签，未发现失效链接
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                发现 {deadLinks.length} 个失效链接（共检测 {(results || []).length} 个）
              </div>

              {deadLinks.map((item) => (
                <div
                  key={item.bookmarkId}
                  className="flex items-start gap-3 rounded-xl border px-3 py-2.5"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                >
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {item.title}
                    </div>
                    <div className="text-xs truncate mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <ExternalLink size={10} />
                      <span className="truncate">{item.url}</span>
                    </div>
                    {item.error && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>
                        {item.error}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteBookmark(item.bookmarkId, item.title)}
                    className="flex-shrink-0 p-1 rounded-md hover:opacity-80"
                    style={{ color: 'var(--danger)' }}
                    title="删除此书签"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
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
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
