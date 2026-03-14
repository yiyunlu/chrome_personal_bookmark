import React from 'react';

export function Sidebar({
  sources,
  activeSourceId,
  onSourceChange,
  themeMode,
  onThemeModeChange,
  collections,
  activeCollectionId,
  onCollectionSelect,
  canSortCollections,
  onCollectionContextMenu
}) {
  return (
    <aside className="sidebar">
      <div className="mb-5">
        <div className="text-xl font-semibold tracking-wide">TabHub</div>
        <div className="text-xs opacity-70 mt-1">My Collections</div>
      </div>

      <div className="mb-4">
        <label className="control-label">书签源</label>
        <select
          className="input-control"
          value={activeSourceId}
          onChange={(e) => onSourceChange(e.target.value)}
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.isTabHub ? 'TabHub' : source.title}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="control-label">主题</label>
        <select
          className="input-control"
          value={themeMode}
          onChange={(e) => onThemeModeChange(e.target.value)}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </div>

      <nav className="sidebar-nav space-y-1" data-nav-sortable="true">
        <button
          className={`nav-btn ${activeCollectionId === 'all' ? 'nav-btn-active' : ''}`}
          onClick={() => onCollectionSelect('all')}
        >
          All Collections
        </button>
        {collections.map((collection) => (
          <button
            key={collection.id}
            data-collection-id={collection.id}
            data-draggable={String(canSortCollections && collection.editable && collection.parentId === activeSourceId)}
            className={`nav-btn ${activeCollectionId === collection.id ? 'nav-btn-active' : ''}`}
            onClick={() => onCollectionSelect(collection.id)}
            onContextMenu={(e) => onCollectionContextMenu(e, collection)}
            title={collection.editable || collection.deletable ? '右键可编辑目录' : '系统目录，禁止编辑'}
          >
            <span className="nav-btn-inner">
              <span className="nav-drag-handle" aria-hidden="true">⋮⋮</span>
              <span className="truncate">{collection.title}</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
