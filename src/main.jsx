import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Sortable from 'sortablejs';
import './index.css';
import {
  getCollectionsPayload,
  moveBookmark,
  openBookmarkInCurrentTab,
  removeCollectionFolder,
  removeBookmark,
  renameCollectionFolder,
  saveCurrentWindowTabsToCollection,
  subscribeBookmarksChanges,
  updateBookmark
} from './lib/bookmarkService';

const THEME_STORAGE_KEY = 'tabhub_theme_mode';

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result?.[key]);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function faviconCandidates(url) {
  const extensionFavicon = `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
  return [
    extensionFavicon,
    `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`
  ];
}

function BookmarkIcon({ url, title }) {
  const candidates = useMemo(() => faviconCandidates(url), [url]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [url]);

  const fallbackChar = (title || 'L').trim().charAt(0).toUpperCase();

  if (failed) {
    return (
      <div className="icon-fallback">
        {fallbackChar}
      </div>
    );
  }

  return (
    <img
      src={candidates[idx]}
      alt=""
      className="h-5 w-5 rounded"
      onError={() => {
        if (idx < candidates.length - 1) {
          setIdx((prev) => prev + 1);
          return;
        }
        setFailed(true);
      }}
    />
  );
}

function App() {
  const [tabHubRootId, setTabHubRootId] = useState('');
  const [sources, setSources] = useState([]);
  const [activeSourceId, setActiveSourceId] = useState('');
  const activeSourceRef = useRef('');

  const [collections, setCollections] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCollectionId, setActiveCollectionId] = useState('all');
  const [collapsedCollectionIds, setCollapsedCollectionIds] = useState(new Set());

  const [themeMode, setThemeMode] = useState('system');
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const [contextMenu, setContextMenu] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [editorState, setEditorState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navSortableRef = useRef(null);
  const moduleSortableRef = useRef(null);

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;
  const dragEnabled = search.trim() === '';
  const activeSource = sources.find((source) => source.id === activeSourceId) || null;
  const canSortCollections = dragEnabled && activeCollectionId === 'all';

  const topLevelSortableCollections = useMemo(
    () => collections.filter((collection) => collection.editable && collection.parentId === activeSourceId),
    [collections, activeSourceId]
  );
  const movableCollections = useMemo(() => collections, [collections]);
  const filteredMoveTargets = useMemo(() => {
    if (!editorState) return [];
    const keyword = editorState.folderQuery.trim().toLowerCase();
    if (!keyword) return movableCollections;
    return movableCollections.filter((collection) => collection.title.toLowerCase().includes(keyword));
  }, [editorState, movableCollections]);

  const refresh = async (preferredSourceId = activeSourceRef.current) => {
    try {
      const result = await getCollectionsPayload(preferredSourceId);
      setTabHubRootId(result.tabHubRootId);
      setSources(result.sources);
      setActiveSourceId(result.activeSourceId);
      activeSourceRef.current = result.activeSourceId;
      setCollections(result.collections);
      setError('');
    } catch (e) {
      setError(e?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const savedMode = await storageGet(THEME_STORAGE_KEY);
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setThemeMode(savedMode);
      }
    })();

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onMediaChange);

    refresh();
    const unsubscribe = subscribeBookmarksChanges(() => {
      refresh(activeSourceRef.current);
    });

    return () => {
      media.removeEventListener('change', onMediaChange);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  const visibleCollections = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const filtered = collections
      .map((collection) => ({
        ...collection,
        cards: collection.cards.filter((card) => {
          if (!keyword) return true;
          return (
            card.title.toLowerCase().includes(keyword) ||
            card.url.toLowerCase().includes(keyword)
          );
        })
      }))
      .filter((collection) => collection.cards.length > 0 || !keyword);

    if (activeCollectionId === 'all') {
      return filtered;
    }
    return filtered.filter((collection) => collection.id === activeCollectionId);
  }, [collections, search, activeCollectionId]);

  const persistTopLevelCollectionOrder = async (orderedIds) => {
    const sortableMap = new Map(topLevelSortableCollections.map((collection) => [collection.id, collection]));
    const filteredIds = orderedIds.filter((id) => sortableMap.has(id));
    if (filteredIds.length < 2) return;

    const baseIndex = Math.min(...filteredIds.map((id) => sortableMap.get(id).index ?? 0));

    for (let i = 0; i < filteredIds.length; i += 1) {
      const collectionId = filteredIds[i];
      await moveBookmark(collectionId, activeSourceId, baseIndex + i);
    }
    await refresh(activeSourceRef.current);
  };

  useEffect(() => {
    const container = document.querySelector('[data-nav-sortable="true"]');
    if (!container) return;

    if (navSortableRef.current) {
      navSortableRef.current.destroy();
      navSortableRef.current = null;
    }
    if (!canSortCollections) return;

    navSortableRef.current = new Sortable(container, {
      animation: 140,
      draggable: '[data-draggable="true"]',
      handle: '.nav-drag-handle',
      ghostClass: 'card-dragging',
      onEnd: async () => {
        const orderedIds = Array.from(container.querySelectorAll('[data-draggable="true"]')).map((el) =>
          el.getAttribute('data-collection-id')
        );
        await persistTopLevelCollectionOrder(orderedIds);
      }
    });

    return () => {
      if (navSortableRef.current) {
        navSortableRef.current.destroy();
        navSortableRef.current = null;
      }
    };
  }, [canSortCollections, topLevelSortableCollections, activeSourceId]);

  useEffect(() => {
    const container = document.querySelector('[data-module-sortable="true"]');
    if (!container) return;

    if (moduleSortableRef.current) {
      moduleSortableRef.current.destroy();
      moduleSortableRef.current = null;
    }
    if (!canSortCollections) return;

    moduleSortableRef.current = new Sortable(container, {
      animation: 160,
      draggable: '[data-draggable="true"]',
      handle: '.collection-drag-handle',
      ghostClass: 'card-dragging',
      onEnd: async () => {
        const orderedIds = Array.from(container.querySelectorAll('[data-draggable="true"]')).map((el) =>
          el.getAttribute('data-collection-id')
        );
        await persistTopLevelCollectionOrder(orderedIds);
      }
    });

    return () => {
      if (moduleSortableRef.current) {
        moduleSortableRef.current.destroy();
        moduleSortableRef.current = null;
      }
    };
  }, [canSortCollections, topLevelSortableCollections, activeSourceId, visibleCollections]);

  const handleSaveTabs = async () => {
    const targetRootId = activeSourceId || tabHubRootId;
    if (!targetRootId) return;
    await saveCurrentWindowTabsToCollection(targetRootId);
    await refresh(activeSourceRef.current);
  };

  const handleThemeModeChange = async (mode) => {
    setThemeMode(mode);
    await storageSet(THEME_STORAGE_KEY, mode);
  };

  const handleSourceChange = async (sourceId) => {
    setActiveCollectionId('all');
    setCollapsedCollectionIds(new Set());
    await refresh(sourceId);
  };

  const toggleCollection = (collectionId) => {
    setCollapsedCollectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  const openCardContextMenu = (event, card) => {
    event.preventDefault();
    setContextMenu({
      kind: 'card',
      x: event.clientX,
      y: event.clientY,
      card
    });
  };

  const openCollectionContextMenu = (event, collection) => {
    if (!collection.editable && !collection.deletable) {
      return;
    }
    event.preventDefault();
    setContextMenu({
      kind: 'collection',
      x: event.clientX,
      y: event.clientY,
      collection
    });
  };

  const handleEditCard = async () => {
    if (contextMenu?.kind !== 'card' || !contextMenu.card) return;
    const current = contextMenu.card;
    setContextMenu(null);
    setEditorState({
      cardId: current.id,
      title: current.title,
      url: current.url,
      currentParentId: current.parentId,
      targetParentId: current.parentId,
      folderQuery: '',
      saving: false
    });
  };

  const handleDeleteCardByCard = async (card) => {
    const shouldDelete = window.confirm(`删除书签：${card.title} ?`);
    if (!shouldDelete) return;

    await removeBookmark(card.id);
    await refresh(activeSourceRef.current);
  };

  const handleDeleteCard = async () => {
    if (contextMenu?.kind !== 'card' || !contextMenu.card) return;
    const current = contextMenu.card;
    setContextMenu(null);
    await handleDeleteCardByCard(current);
  };

  const handleRenameCollection = async () => {
    if (contextMenu?.kind !== 'collection' || !contextMenu.collection?.editable) return;
    const current = contextMenu.collection;
    setContextMenu(null);

    const nextTitle = window.prompt('重命名目录', current.folderTitle || current.title);
    if (nextTitle == null) return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;

    await renameCollectionFolder(current.id, trimmed);
    await refresh(activeSourceRef.current);
  };

  const handleDeleteCollection = async () => {
    if (contextMenu?.kind !== 'collection' || !contextMenu.collection?.deletable) return;
    const current = contextMenu.collection;
    setContextMenu(null);

    const shouldDelete = window.confirm(`删除目录“${current.title}”及其全部书签？`);
    if (!shouldDelete) return;

    await removeCollectionFolder(current.id);
    if (activeCollectionId === current.id) {
      setActiveCollectionId('all');
    }
    await refresh(activeSourceRef.current);
  };

  const handleOpenCard = async (event, url) => {
    event.stopPropagation();
    await openBookmarkInCurrentTab(url);
  };

  const handleEditorClose = () => {
    setEditorState(null);
  };

  const handleEditorSave = async () => {
    if (!editorState || editorState.saving) return;
    const targetCollection = collections.find((collection) => collection.id === editorState.targetParentId);
    const nextTitle = editorState.title.trim();
    const nextUrl = editorState.url.trim();
    if (!nextTitle || !nextUrl) return;

    setEditorState((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      await updateBookmark(editorState.cardId, {
        title: nextTitle,
        url: nextUrl
      });
      if (editorState.targetParentId !== editorState.currentParentId && targetCollection) {
        await moveBookmark(editorState.cardId, editorState.targetParentId, targetCollection.cards.length);
      }
      await refresh(activeSourceRef.current);
      setEditorState(null);
    } finally {
      setEditorState((prev) => (prev ? { ...prev, saving: false } : prev));
    }
  };

  return (
    <div className="app-shell">
      <div className="layout-root">
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
              onChange={(e) => handleSourceChange(e.target.value)}
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
              onChange={(e) => handleThemeModeChange(e.target.value)}
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>

          <nav className="sidebar-nav space-y-1" data-nav-sortable="true">
            <button
              className={`nav-btn ${activeCollectionId === 'all' ? 'nav-btn-active' : ''}`}
              onClick={() => setActiveCollectionId('all')}
            >
              All Collections
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                data-collection-id={collection.id}
                data-draggable={
                  String(canSortCollections && collection.editable && collection.parentId === activeSourceId)
                }
                className={`nav-btn ${activeCollectionId === collection.id ? 'nav-btn-active' : ''}`}
                onClick={() => setActiveCollectionId(collection.id)}
                onContextMenu={(e) => openCollectionContextMenu(e, collection)}
                title={
                  collection.editable || collection.deletable ? '右键可编辑目录' : '系统目录，禁止编辑'
                }
              >
                <span className="nav-btn-inner">
                  <span className="nav-drag-handle" aria-hidden="true">⋮⋮</span>
                  <span className="truncate">{collection.title}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="content-area">
          <header className="toolbar">
            <button
              onClick={handleSaveTabs}
              className="primary-btn"
              disabled={!activeSourceId && !tabHubRootId}
            >
              保存当前所有标签页到 {activeSource?.isTabHub ? 'TabHub' : activeSource?.title || '当前书签源'}
            </button>
            <button
              type="button"
              className={`secondary-btn ${manageMode ? 'secondary-btn-active' : ''}`}
              onClick={() => setManageMode((prev) => !prev)}
            >
              {manageMode ? '退出管理模式' : '进入管理模式'}
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索书签标题或 URL"
              className="search-input"
            />
          </header>

          {loading ? (
            <div className="muted">Loading...</div>
          ) : error ? (
            <div className="error-panel">{error}</div>
          ) : visibleCollections.length === 0 ? (
            <div className="empty-panel">暂无可显示书签。</div>
          ) : (
            <section className="space-y-5" data-module-sortable="true">
              {visibleCollections.map((collection) => {
                const collapsed = collapsedCollectionIds.has(collection.id);
                const moduleDraggable =
                  canSortCollections && collection.editable && collection.parentId === activeSourceId;
                return (
                  <article
                    key={collection.id}
                    className="collection-card"
                    data-collection-id={collection.id}
                    data-draggable={String(moduleDraggable)}
                  >
                    <button
                      className="collection-header"
                      onClick={() => toggleCollection(collection.id)}
                      type="button"
                    >
                      <span className="collection-header-left">
                        <span className="collection-drag-handle" aria-hidden="true">⋮⋮</span>
                        <span className="font-semibold">{collection.title}</span>
                      </span>
                      <span className="text-xs opacity-70">{collection.cards.length} items {collapsed ? '▸' : '▾'}</span>
                    </button>

                    {!collapsed && (
                      <div
                        data-cards-collection-id={collection.id}
                        data-parent-id={collection.id}
                        className={`collection-grid collection-drop-zone p-1 ${!dragEnabled ? 'opacity-80' : ''}`}
                      >
                        {collection.cards.map((card) => (
                          <div
                            key={card.id}
                            data-card-id={card.id}
                            className="bookmark-card"
                            onContextMenu={(e) => openCardContextMenu(e, card)}
                            title={card.url}
                          >
                            <BookmarkIcon url={card.url} title={card.title} />
                            <span className="truncate text-sm font-medium">{card.title}</span>
                            <button
                              type="button"
                              className="card-open-btn"
                              onClick={(e) => handleOpenCard(e, card.url)}
                              title="在当前标签页打开"
                              draggable="false"
                            >
                              Open
                            </button>
                            {manageMode && (
                              <div className="card-manage-actions">
                                <button
                                  type="button"
                                  className="card-mini-btn"
                                  onClick={() =>
                                    setEditorState({
                                      cardId: card.id,
                                      title: card.title,
                                      url: card.url,
                                      currentParentId: card.parentId,
                                      targetParentId: card.parentId,
                                      folderQuery: '',
                                      saving: false
                                    })
                                  }
                                >
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  className="card-mini-btn card-mini-btn-danger"
                                  onClick={() => handleDeleteCardByCard(card)}
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </main>
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.kind === 'card' && (
            <>
              <button type="button" className="context-item" onClick={handleEditCard}>
                编辑书签（含目录）
              </button>
              <button type="button" className="context-item context-item-danger" onClick={handleDeleteCard}>
                删除书签
              </button>
            </>
          )}
          {contextMenu.kind === 'collection' && (
            <>
              <button type="button" className="context-item" onClick={handleRenameCollection}>
                重命名目录
              </button>
              <button
                type="button"
                className="context-item context-item-danger"
                onClick={handleDeleteCollection}
              >
                删除目录
              </button>
            </>
          )}
        </div>
      )}

      {editorState && (
        <div className="modal-backdrop" onClick={handleEditorClose}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">编辑书签</div>
            <div className="modal-body">
              <label className="control-label">标题</label>
              <input
                className="input-control"
                value={editorState.title}
                onChange={(e) =>
                  setEditorState((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
              />
              <label className="control-label mt-3">URL</label>
              <input
                className="input-control"
                value={editorState.url}
                onChange={(e) =>
                  setEditorState((prev) => (prev ? { ...prev, url: e.target.value } : prev))
                }
              />
              <label className="control-label mt-3">移动到文件夹</label>
              <input
                className="input-control"
                placeholder="搜索文件夹..."
                value={editorState.folderQuery}
                onChange={(e) =>
                  setEditorState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))
                }
              />
              <div className="folder-list">
                {filteredMoveTargets.map((collection) => (
                  <button
                    type="button"
                    key={collection.id}
                    className={`folder-item ${
                      editorState.targetParentId === collection.id ? 'folder-item-active' : ''
                    }`}
                    onClick={() =>
                      setEditorState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))
                    }
                  >
                    {collection.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={handleEditorClose}>
                取消
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleEditorSave}
                disabled={editorState.saving}
              >
                {editorState.saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
