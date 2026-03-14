import React from 'react';

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
    <header className="toolbar">
      <button
        onClick={onSaveTabs}
        className="primary-btn"
        disabled={!activeSourceId && !tabHubRootId}
      >
        保存当前所有标签页到 {activeSource?.isTabHub ? 'TabHub' : activeSource?.title || '当前书签源'}
      </button>
      <button
        type="button"
        className={`secondary-btn ${manageMode ? 'secondary-btn-active' : ''}`}
        onClick={onToggleManage}
      >
        {manageMode ? '退出管理模式' : '进入管理模式'}
      </button>
      <button
        type="button"
        className="secondary-btn"
        onClick={onAutoOrganize}
        disabled={autoOrganizing}
      >
        {autoOrganizing ? '自动整理中...' : '自动整理'}
      </button>
      <input
        ref={searchInputRef}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="搜索书签标题或 URL"
        className="search-input"
      />
    </header>
  );
}

export function QuickEntry({ searchInputRef, onSaveTabs, onAutoOrganize, onToggleManage }) {
  return (
    <div className="quick-entry">
      <span className="quick-entry-label">效率入口:</span>
      <button type="button" className="quick-chip" onClick={() => searchInputRef.current?.focus()}>
        / 搜索
      </button>
      <button type="button" className="quick-chip" onClick={onSaveTabs}>
        S 保存当前标签
      </button>
      <button type="button" className="quick-chip" onClick={onAutoOrganize}>
        O 自动整理
      </button>
      <button type="button" className="quick-chip" onClick={onToggleManage}>
        M 管理模式
      </button>
    </div>
  );
}

export function BatchToolbar({ selectedCount, onBatchMove, onBatchTrash, onClearSelections }) {
  return (
    <div className="batch-toolbar">
      <div className="batch-count">已选 {selectedCount} 项</div>
      <button
        type="button"
        className="secondary-btn"
        disabled={selectedCount === 0}
        onClick={onBatchMove}
      >
        批量移动
      </button>
      <button
        type="button"
        className="secondary-btn"
        disabled={selectedCount === 0}
        onClick={onBatchTrash}
      >
        删除到回收站
      </button>
      <button type="button" className="secondary-btn" onClick={onClearSelections}>
        清空选择
      </button>
    </div>
  );
}
