import React from 'react';
import { CheckSquare, Download, Search, Sparkles, Square } from 'lucide-react';

export function Toolbar({
  activeSource,
  activeSourceId,
  tabHubRootId,
  onSaveTabs,
  manageMode,
  onToggleManage,
  autoOrganizing,
  onAutoOrganize,
  search,
  onSearchChange,
  searchInputRef
}) {
  return (
    <header className="mb-5 space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted)' }}
        />
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索书签标题或 URL…"
          className="w-full max-w-2xl pl-9 pr-16 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
        />
        <kbd
          className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[0.65rem] border pointer-events-none"
          style={{ borderColor: 'var(--input-border)', color: 'var(--muted)' }}
        >
          /
        </kbd>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onSaveTabs}
          disabled={!activeSourceId && !tabHubRootId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
          title="快捷键: S"
        >
          <Download size={14} />
          <span>保存标签页</span>
        </button>

        <button
          type="button"
          onClick={onAutoOrganize}
          disabled={autoOrganizing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
          title="快捷键: O"
        >
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span>{autoOrganizing ? '整理中…' : '自动整理'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleManage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium"
          style={{
            background: manageMode ? 'var(--accent-soft)' : 'var(--panel-bg)',
            borderColor: manageMode ? 'var(--accent)' : 'var(--input-border)',
            color: manageMode ? 'var(--accent)' : 'var(--text)'
          }}
          title="快捷键: M"
        >
          {manageMode ? <CheckSquare size={14} /> : <Square size={14} />}
          <span>{manageMode ? '退出管理' : '管理模式'}</span>
        </button>

        {activeSource && (
          <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
            当前: {activeSource.isTabHub ? 'TabHub' : activeSource.title}
          </span>
        )}
      </div>
    </header>
  );
}

export function BatchToolbar({ selectedCount, onBatchMove, onBatchTrash, onClearSelections }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-4 px-3 py-2 rounded-xl border animate-fade-in"
      style={{
        background: 'var(--accent-soft)',
        borderColor: 'var(--accent)'
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
        已选 {selectedCount} 项
      </span>
      <div className="flex-1" />
      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onBatchMove}
        className="px-2.5 py-1 rounded-lg border text-xs font-medium disabled:opacity-40"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
      >
        批量移动
      </button>
      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onBatchTrash}
        className="px-2.5 py-1 rounded-lg text-xs font-medium"
        style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
      >
        删除
      </button>
      <button
        type="button"
        onClick={onClearSelections}
        className="px-2.5 py-1 rounded-lg border text-xs"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--muted)' }}
      >
        清空
      </button>
    </div>
  );
}
