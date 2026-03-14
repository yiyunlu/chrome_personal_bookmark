import React from 'react';
import { Check, FolderOpen, Sparkles, X } from 'lucide-react';

export function AICategorizeModal({ aiState, onAcceptSuggestion, onRejectSuggestion, onApplyAll, onClose }) {
  if (!aiState) return null;

  const { loading, suggestions, newCollections, error } = aiState;
  const pending = suggestions.filter((s) => s.status === 'pending');
  const accepted = suggestions.filter((s) => s.status === 'accepted');

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
            <Sparkles size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              AI 智能分类
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
                正在分析书签…
              </span>
            </div>
          ) : error ? (
            <div className="py-6 text-center">
              <div className="text-sm" style={{ color: 'var(--danger)' }}>
                {error}
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-6 text-center">
              <div className="text-sm" style={{ color: 'var(--muted)' }}>
                所有书签已在合适的分类中，无需调整。
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {newCollections.length > 0 && (
                <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                  建议新建分类：
                  {newCollections.map((name) => (
                    <span
                      key={name}
                      className="inline-block ml-1 px-1.5 py-0.5 rounded text-xs"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border px-3 py-2.5"
                  style={{
                    borderColor: suggestion.status === 'rejected' ? 'var(--panel-border)' : 'var(--panel-border)',
                    background: suggestion.status === 'rejected' ? 'transparent' : 'var(--panel-bg)',
                    opacity: suggestion.status === 'rejected' ? 0.4 : 1
                  }}
                >
                  <FolderOpen size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)', opacity: 0.7 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {suggestion.bookmarkTitle}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      → {suggestion.targetCollectionTitle}
                      <span className="ml-2">{suggestion.reason}</span>
                    </div>
                  </div>
                  {suggestion.status === 'pending' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onAcceptSuggestion(idx)}
                        className="p-1 rounded-md hover:opacity-80"
                        style={{ color: 'var(--accent)' }}
                        title="接受"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => onRejectSuggestion(idx)}
                        className="p-1 rounded-md hover:opacity-80"
                        style={{ color: 'var(--muted)' }}
                        title="拒绝"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {suggestion.status === 'accepted' && (
                    <span className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      已接受
                    </span>
                  )}
                  {suggestion.status === 'rejected' && (
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                      已忽略
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && suggestions.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--panel-border)' }}>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {accepted.length} 项已接受，{pending.length} 项待确认
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border text-sm"
                style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={onApplyAll}
                disabled={accepted.length === 0}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
              >
                应用 {accepted.length} 项
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
