import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Sortable from 'sortablejs';
import './index.css';
import {
  ensureTrashFolder,
  getCollectionsPayload,
  moveBookmark,
  openBookmarkInCurrentTab,
  removeCollectionFolder,
  renameCollectionFolder,
  saveCurrentWindowTabsToCollection,
  subscribeBookmarksChanges,
  updateBookmark
} from './lib/bookmarkService';

const THEME_STORAGE_KEY = 'tabhub_theme_mode';
const HARD_RELOAD_AFTER_CARD_DROP = true;

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
    return <div className="icon-fallback">{fallbackChar}</div>;
  }

  return (
    <img
      src={candidates[idx]}
      alt=""
      className="h-5 w-5 rounded"
      draggable="false"
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

function sortSnapshots(items) {
  return [...items].sort((a, b) => {
    if (a.parentId === b.parentId) {
      return (a.index ?? 0) - (b.index ?? 0);
    }
    return String(a.parentId).localeCompare(String(b.parentId));
  });
}

function normalizeUrlKey(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.endsWith('/') && url.pathname !== '/' ? url.pathname.slice(0, -1) : url.pathname;
    return `${url.protocol}//${host}${path}${url.search}`;
  } catch {
    return String(rawUrl || '').trim().toLowerCase();
  }
}

function App() {
  const [tabHubRootId, setTabHubRootId] = useState('');
  const [sources, setSources] = useState([]);
  const [activeSourceId, setActiveSourceId] = useState('');
  const [trashFolderId, setTrashFolderId] = useState('');
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
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [editorState, setEditorState] = useState(null);
  const [batchMoveState, setBatchMoveState] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const [autoOrganizing, setAutoOrganizing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navSortableRef = useRef(null);
  const moduleSortableRef = useRef(null);
  const cardSortablesRef = useRef(new Map());
  const undoTimerRef = useRef(null);
  const dragReleaseTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const cardDragActiveRef = useRef(false);
  const suppressCardOpenUntilRef = useRef(0);
  const suppressNextCardClickRef = useRef(false);

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;
  const dragEnabled = search.trim() === '';
  const cardDragEnabled = dragEnabled && !manageMode;
  const activeSource = sources.find((source) => source.id === activeSourceId) || null;
  const canSortCollections = dragEnabled && activeCollectionId === 'all';

  const topLevelSortableCollections = useMemo(
    () => collections.filter((collection) => collection.editable && collection.parentId === activeSourceId),
    [collections, activeSourceId]
  );

  const allCards = useMemo(
    () =>
      collections.flatMap((collection) =>
        collection.cards.map((card) => ({
          ...card,
          collectionId: collection.id,
          collectionTitle: collection.title
        }))
      ),
    [collections]
  );

  const cardById = useMemo(() => new Map(allCards.map((card) => [card.id, card])), [allCards]);

  const selectedCards = useMemo(
    () => Array.from(selectedCardIds).map((id) => cardById.get(id)).filter(Boolean),
    [selectedCardIds, cardById]
  );

  const movableCollections = useMemo(() => collections, [collections]);

  const filteredEditorTargets = useMemo(() => {
    if (!editorState) return [];
    const keyword = editorState.folderQuery.trim().toLowerCase();
    if (!keyword) return movableCollections;
    return movableCollections.filter((collection) => collection.title.toLowerCase().includes(keyword));
  }, [editorState, movableCollections]);

  const filteredBatchTargets = useMemo(() => {
    if (!batchMoveState) return [];
    const keyword = batchMoveState.folderQuery.trim().toLowerCase();
    if (!keyword) return movableCollections;
    return movableCollections.filter((collection) => collection.title.toLowerCase().includes(keyword));
  }, [batchMoveState, movableCollections]);

  const refresh = async (preferredSourceId = activeSourceRef.current) => {
    try {
      const result = await getCollectionsPayload(preferredSourceId);
      setTabHubRootId(result.tabHubRootId);
      setSources(result.sources);
      setActiveSourceId(result.activeSourceId);
      setTrashFolderId(result.trashFolderId || '');
      activeSourceRef.current = result.activeSourceId;
      setCollections(result.collections);
      setError('');
    } catch (e) {
      setError(e?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const showUndo = (message, undo) => {
    const id = Date.now();
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoToast({ id, message, undo, pending: false });
    undoTimerRef.current = setTimeout(() => {
      setUndoToast((prev) => (prev?.id === id ? null : prev));
      undoTimerRef.current = null;
    }, 8000);
  };

  const handleUndo = async () => {
    if (!undoToast || undoToast.pending) return;
    const action = undoToast;
    setUndoToast((prev) => (prev ? { ...prev, pending: true } : prev));
    try {
      await action.undo();
      await refresh(activeSourceRef.current);
    } finally {
      setUndoToast(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
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

  useEffect(
    () => () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      if (dragReleaseTimerRef.current) {
        clearTimeout(dragReleaseTimerRef.current);
        dragReleaseTimerRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    const captureCardClick = (event) => {
      if (!suppressNextCardClickRef.current) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-card-id]')) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      suppressNextCardClickRef.current = false;
    };

    document.addEventListener('click', captureCardClick, true);
    document.addEventListener('mouseup', captureCardClick, true);
    return () => {
      document.removeEventListener('click', captureCardClick, true);
      document.removeEventListener('mouseup', captureCardClick, true);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        const typing = tag === 'input' || tag === 'textarea' || target.isContentEditable;
        if (typing) return;
      }

      const key = event.key.toLowerCase();
      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (key === 's') {
        event.preventDefault();
        handleSaveTabs();
      } else if (key === 'o') {
        event.preventDefault();
        if (!autoOrganizing) {
          handleAutoOrganize();
        }
      } else if (key === 'm') {
        event.preventDefault();
        setManageMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [autoOrganizing, activeSourceId, tabHubRootId, collections]);

  useEffect(() => {
    setSelectedCardIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => cardById.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [cardById]);

  useEffect(() => {
    if (!manageMode) {
      setSelectedCardIds(new Set());
      setBatchMoveState(null);
    }
  }, [manageMode]);

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

  useEffect(() => {
    if (!cardDragEnabled) {
      for (const sortable of cardSortablesRef.current.values()) {
        sortable.destroy();
      }
      cardSortablesRef.current.clear();
      return;
    }

    const expandedIds = new Set(
      visibleCollections.filter((collection) => !collapsedCollectionIds.has(collection.id)).map((c) => c.id)
    );

    visibleCollections.forEach((collection) => {
      if (collapsedCollectionIds.has(collection.id)) return;

      const container = document.querySelector(`[data-cards-collection-id=\"${collection.id}\"]`);
      if (!container || cardSortablesRef.current.has(collection.id)) {
        return;
      }

      const sortable = new Sortable(container, {
        animation: 150,
        draggable: '[data-card-id]',
        handle: '.card-drag-handle',
        forceFallback: true,
        fallbackOnBody: true,
        group: {
          name: 'bookmark-cards',
          pull: true,
          put: true
        },
        emptyInsertThreshold: 28,
        ghostClass: 'card-dragging',
        chosenClass: 'card-dragging',
        dragClass: 'card-dragging',
        onStart: () => {
          cardDragActiveRef.current = true;
          suppressCardOpenUntilRef.current = Date.now() + 1500;
          suppressNextCardClickRef.current = true;
          if (dragReleaseTimerRef.current) {
            clearTimeout(dragReleaseTimerRef.current);
            dragReleaseTimerRef.current = null;
          }
        },
        onEnd: async (evt) => {
          const bookmarkId = evt.item.getAttribute('data-card-id');
          const oldParentId = evt.from.getAttribute('data-parent-id');
          const newParentId = evt.to.getAttribute('data-parent-id');
          suppressCardOpenUntilRef.current = Date.now() + 1800;
          suppressNextCardClickRef.current = true;

          try {
            if (!bookmarkId || !oldParentId || !newParentId || evt.newIndex == null) {
              return;
            }
            if (oldParentId === newParentId && evt.oldIndex === evt.newIndex) {
              return;
            }

            await moveBookmark(bookmarkId, newParentId, evt.newIndex);
            if (HARD_RELOAD_AFTER_CARD_DROP) {
              setTimeout(() => {
                window.location.reload();
              }, 60);
              return;
            }
            showUndo('已移动 1 个书签', async () => {
              await moveBookmark(bookmarkId, oldParentId, evt.oldIndex ?? 0);
            });
            await refresh(activeSourceRef.current);
          } finally {
            dragReleaseTimerRef.current = setTimeout(() => {
              cardDragActiveRef.current = false;
              suppressNextCardClickRef.current = false;
              dragReleaseTimerRef.current = null;
            }, 900);
          }
        }
      });

      cardSortablesRef.current.set(collection.id, sortable);
    });

    for (const [collectionId, sortable] of cardSortablesRef.current.entries()) {
      if (!expandedIds.has(collectionId)) {
        sortable.destroy();
        cardSortablesRef.current.delete(collectionId);
      }
    }
  }, [cardDragEnabled, visibleCollections, collapsedCollectionIds]);

  const moveCardsWithUndo = async (cards, targetParentId, undoLabel) => {
    if (!cards.length) return;
    const snapshots = cards.map((card) => ({
      id: card.id,
      title: card.title,
      parentId: card.parentId,
      index: card.index
    }));

    const targetCollection = collections.find((collection) => collection.id === targetParentId);
    let insertIndex = targetCollection ? targetCollection.cards.length : 0;

    for (const card of cards) {
      await moveBookmark(card.id, targetParentId, insertIndex);
      insertIndex += 1;
    }

    showUndo(undoLabel, async () => {
      for (const snapshot of sortSnapshots(snapshots)) {
        await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
      }
    });

    await refresh(activeSourceRef.current);
  };

  const moveCardsToTrash = async (cards) => {
    if (!cards.length) return;

    const rootId = activeSourceId || tabHubRootId;
    if (!rootId) return;

    const trashFolder = trashFolderId
      ? { id: trashFolderId }
      : await ensureTrashFolder(rootId);

    const snapshots = cards.map((card) => ({
      id: card.id,
      title: card.title,
      parentId: card.parentId,
      index: card.index
    }));

    let insertIndex = 0;
    for (const card of cards) {
      await moveBookmark(card.id, trashFolder.id, insertIndex);
      insertIndex += 1;
    }

    showUndo(`已移入回收站 ${cards.length} 项`, async () => {
      for (const snapshot of sortSnapshots(snapshots)) {
        await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
      }
    });

    await refresh(activeSourceRef.current);
  };

  const openEditorByCard = (card) => {
    setEditorState({
      cardId: card.id,
      title: card.title,
      url: card.url,
      currentParentId: card.parentId,
      targetParentId: card.parentId,
      folderQuery: '',
      saving: false
    });
  };

  const handleSaveTabs = async () => {
    const targetRootId = activeSourceId || tabHubRootId;
    if (!targetRootId) return;
    await saveCurrentWindowTabsToCollection(targetRootId);
    await refresh(activeSourceRef.current);
  };

  const handleAutoOrganize = async () => {
    if (autoOrganizing || !collections.length) return;

    const rootId = activeSourceId || tabHubRootId;
    if (!rootId) return;

    setAutoOrganizing(true);
    try {
      const trashFolder = trashFolderId ? { id: trashFolderId } : await ensureTrashFolder(rootId);
      const cardsBefore = collections.flatMap((collection) =>
        collection.cards.map((card) => ({
          id: card.id,
          title: card.title,
          url: card.url,
          parentId: card.parentId,
          index: card.index
        }))
      );

      const seen = new Set();
      const duplicates = [];
      for (const card of cardsBefore) {
        const key = normalizeUrlKey(card.url);
        if (!key) continue;
        if (seen.has(key)) {
          duplicates.push(card);
        } else {
          seen.add(key);
        }
      }

      let trashInsertIndex = 0;
      for (const card of duplicates) {
        await moveBookmark(card.id, trashFolder.id, trashInsertIndex);
        trashInsertIndex += 1;
      }

      const snapshotById = new Map(cardsBefore.map((card) => [card.id, card]));
      const duplicateIdSet = new Set(duplicates.map((card) => card.id));
      const keptCards = cardsBefore.filter((card) => !duplicateIdSet.has(card.id));
      const byCollection = new Map();
      for (const card of keptCards) {
        const list = byCollection.get(card.parentId) || [];
        list.push(card);
        byCollection.set(card.parentId, list);
      }

      let sortedMoves = 0;
      for (const [parentId, cards] of byCollection.entries()) {
        const sorted = [...cards].sort((a, b) => {
          const ta = (a.title || '').toLowerCase();
          const tb = (b.title || '').toLowerCase();
          if (ta !== tb) return ta.localeCompare(tb);
          return (a.url || '').localeCompare(b.url || '');
        });
        const alreadySorted = cards.every((card, idx) => card.id === sorted[idx].id);
        if (alreadySorted) continue;
        for (let i = 0; i < sorted.length; i += 1) {
          await moveBookmark(sorted[i].id, parentId, i);
          sortedMoves += 1;
        }
      }

      const totalAffected = duplicates.length + sortedMoves;
      if (totalAffected > 0) {
        showUndo(`自动整理完成：去重 ${duplicates.length}，重排 ${sortedMoves}`, async () => {
          for (const snapshot of sortSnapshots(Array.from(snapshotById.values()))) {
            await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
          }
        });
      }

      await refresh(activeSourceRef.current);
    } finally {
      setAutoOrganizing(false);
    }
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

  const toggleCardSelection = (cardId) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const clearSelections = () => setSelectedCardIds(new Set());

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
    if (!collection.editable && !collection.deletable) return;
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
    openEditorByCard(current);
  };

  const handleDeleteCardByCard = async (card) => {
    const shouldDelete = window.confirm(`删除书签：${card.title} ?`);
    if (!shouldDelete) return;

    await moveCardsToTrash([card]);
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

  const handleCardClick = async (event, card) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (target instanceof Element) {
      if (
        target.closest('.card-drag-handle') ||
        target.closest('.card-mini-btn') ||
        target.closest('.card-select')
      ) {
        return;
      }
    }

    if (cardDragActiveRef.current || Date.now() < suppressCardOpenUntilRef.current) {
      return;
    }

    if (manageMode) {
      toggleCardSelection(card.id);
      return;
    }

    await openBookmarkInCurrentTab(card.url);
  };

  const handleEditorClose = () => setEditorState(null);

  const handleEditorSave = async () => {
    if (!editorState || editorState.saving) return;
    const before = cardById.get(editorState.cardId);
    const targetCollection = collections.find((collection) => collection.id === editorState.targetParentId);
    const nextTitle = editorState.title.trim();
    const nextUrl = editorState.url.trim();
    if (!nextTitle || !nextUrl || !before) return;

    setEditorState((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      await updateBookmark(editorState.cardId, {
        title: nextTitle,
        url: nextUrl
      });

      if (editorState.targetParentId !== editorState.currentParentId && targetCollection) {
        await moveBookmark(editorState.cardId, editorState.targetParentId, targetCollection.cards.length);
      }

      showUndo('书签已更新', async () => {
        await updateBookmark(before.id, {
          title: before.title,
          url: before.url
        });
        if (before.parentId !== editorState.targetParentId) {
          await moveBookmark(before.id, before.parentId, before.index ?? 0);
        }
      });

      await refresh(activeSourceRef.current);
      setEditorState(null);
    } finally {
      setEditorState((prev) => (prev ? { ...prev, saving: false } : prev));
    }
  };

  const openBatchMove = () => {
    if (!selectedCards.length) return;
    setBatchMoveState({
      folderQuery: '',
      targetParentId: selectedCards[0].parentId,
      moving: false
    });
  };

  const closeBatchMove = () => setBatchMoveState(null);

  const handleBatchMoveSave = async () => {
    if (!batchMoveState || batchMoveState.moving || !selectedCards.length) return;
    if (!batchMoveState.targetParentId) return;

    setBatchMoveState((prev) => (prev ? { ...prev, moving: true } : prev));
    try {
      await moveCardsWithUndo(
        selectedCards,
        batchMoveState.targetParentId,
        `已移动 ${selectedCards.length} 个书签`
      );
      clearSelections();
      setBatchMoveState(null);
    } finally {
      setBatchMoveState((prev) => (prev ? { ...prev, moving: false } : prev));
    }
  };

  const handleBatchTrash = async () => {
    if (!selectedCards.length) return;
    const shouldDelete = window.confirm(`将 ${selectedCards.length} 个书签移入回收站？`);
    if (!shouldDelete) return;
    await moveCardsToTrash(selectedCards);
    clearSelections();
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
                data-draggable={String(canSortCollections && collection.editable && collection.parentId === activeSourceId)}
                className={`nav-btn ${activeCollectionId === collection.id ? 'nav-btn-active' : ''}`}
                onClick={() => setActiveCollectionId(collection.id)}
                onContextMenu={(e) => openCollectionContextMenu(e, collection)}
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
            <button
              type="button"
              className="secondary-btn"
              onClick={handleAutoOrganize}
              disabled={autoOrganizing}
            >
              {autoOrganizing ? '自动整理中...' : '自动整理'}
            </button>
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索书签标题或 URL"
              className="search-input"
            />
          </header>

          <div className="quick-entry">
            <span className="quick-entry-label">效率入口:</span>
            <button type="button" className="quick-chip" onClick={() => searchInputRef.current?.focus()}>
              / 搜索
            </button>
            <button type="button" className="quick-chip" onClick={handleSaveTabs}>
              S 保存当前标签
            </button>
            <button type="button" className="quick-chip" onClick={handleAutoOrganize}>
              O 自动整理
            </button>
            <button type="button" className="quick-chip" onClick={() => setManageMode((prev) => !prev)}>
              M 管理模式
            </button>
          </div>

          {manageMode && (
            <div className="batch-toolbar">
              <div className="batch-count">已选 {selectedCards.length} 项</div>
              <button
                type="button"
                className="secondary-btn"
                disabled={selectedCards.length === 0}
                onClick={openBatchMove}
              >
                批量移动
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={selectedCards.length === 0}
                onClick={handleBatchTrash}
              >
                删除到回收站
              </button>
              <button type="button" className="secondary-btn" onClick={clearSelections}>
                清空选择
              </button>
            </div>
          )}

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
                        className={`collection-grid collection-drop-zone p-1 ${!cardDragEnabled ? 'opacity-80' : ''}`}
                      >
                        {collection.cards.map((card) => (
                          <div
                            key={card.id}
                            data-card-id={card.id}
                            className={`bookmark-card ${selectedCardIds.has(card.id) ? 'bookmark-card-selected' : ''}`}
                            onClick={(e) => handleCardClick(e, card)}
                            onContextMenu={(e) => openCardContextMenu(e, card)}
                            title={card.url}
                          >
                            <span className="card-drag-handle" aria-hidden="true">⋮⋮</span>
                            {manageMode && (
                              <input
                                type="checkbox"
                                className="card-select"
                                checked={selectedCardIds.has(card.id)}
                                onChange={() => toggleCardSelection(card.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            <BookmarkIcon url={card.url} title={card.title} />
                            <span className="truncate text-sm font-medium">{card.title}</span>
                            {manageMode && (
                              <div className="card-manage-actions">
                                <button
                                  type="button"
                                  className="card-mini-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditorByCard(card);
                                  }}
                                >
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  className="card-mini-btn card-mini-btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCardByCard(card);
                                  }}
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
                删除到回收站
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
                {filteredEditorTargets.map((collection) => (
                  <button
                    type="button"
                    key={collection.id}
                    className={`folder-item ${editorState.targetParentId === collection.id ? 'folder-item-active' : ''}`}
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

      {batchMoveState && (
        <div className="modal-backdrop" onClick={closeBatchMove}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">批量移动书签（{selectedCards.length} 项）</div>
            <div className="modal-body">
              <label className="control-label">搜索目标文件夹</label>
              <input
                className="input-control"
                placeholder="搜索文件夹..."
                value={batchMoveState.folderQuery}
                onChange={(e) =>
                  setBatchMoveState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))
                }
              />
              <div className="folder-list">
                {filteredBatchTargets.map((collection) => (
                  <button
                    type="button"
                    key={collection.id}
                    className={`folder-item ${batchMoveState.targetParentId === collection.id ? 'folder-item-active' : ''}`}
                    onClick={() =>
                      setBatchMoveState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))
                    }
                  >
                    {collection.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={closeBatchMove}>
                取消
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleBatchMoveSave}
                disabled={batchMoveState.moving || !batchMoveState.targetParentId || selectedCards.length === 0}
              >
                {batchMoveState.moving ? '移动中...' : '批量移动'}
              </button>
            </div>
          </div>
        </div>
      )}

      {undoToast && (
        <div className="undo-toast">
          <span>{undoToast.message}</span>
          <button type="button" className="undo-btn" onClick={handleUndo}>
            {undoToast.pending ? 'Undoing...' : 'Undo'}
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
