import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { normalizeUrlKey, sortSnapshots } from './lib/utils';
import { smartSearch } from './lib/searchService';

import { useTheme } from './hooks/useTheme';
import { useUndoStack } from './hooks/useUndoStack';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { categorizeBookmarks } from './lib/aiService';
import { checkDeadLinks } from './lib/enrichmentService';

import { Sidebar } from './components/Sidebar';
import { Toolbar, BatchToolbar } from './components/Toolbar';
import { CollectionCard } from './components/CollectionCard';
import { ContextMenu } from './components/ContextMenu';
import { EditBookmarkModal } from './components/EditBookmarkModal';
import { BatchMoveModal } from './components/BatchMoveModal';
import { AICategorizeModal } from './components/AICategorizeModal';
import { DeadLinkModal } from './components/DeadLinkModal';
import { UndoToast } from './components/UndoToast';

const HARD_RELOAD_AFTER_CARD_DROP = true;

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

  const [contextMenu, setContextMenu] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [editorState, setEditorState] = useState(null);
  const [batchMoveState, setBatchMoveState] = useState(null);
  const [autoOrganizing, setAutoOrganizing] = useState(false);
  const [aiCategorizeState, setAICategorizeState] = useState(null);
  const [deadLinkState, setDeadLinkState] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navSortableRef = useRef(null);
  const moduleSortableRef = useRef(null);
  const cardSortablesRef = useRef(new Map());
  const dragReleaseTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const cardDragActiveRef = useRef(false);
  const suppressCardOpenUntilRef = useRef(0);
  const suppressNextCardClickRef = useRef(false);

  const { themeMode, handleThemeModeChange } = useTheme();
  const { undoToast, showUndo, handleUndo } = useUndoStack();

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
    () =>
      Array.from(selectedCardIds)
        .map((id) => cardById.get(id))
        .filter(Boolean),
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

  // --- Initialization & subscriptions ---

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeBookmarksChanges(() => {
      refresh(activeSourceRef.current);
    });
    return () => unsubscribe();
  }, []);

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

  // --- Visible collections ---

  const visibleCollections = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    let matchedCardIds = null;
    if (keyword) {
      // Use smart search for fuzzy + category matching
      const searchResults = smartSearch(keyword, allCards);
      matchedCardIds = new Set(searchResults.map((r) => r.bookmark.id));
    }

    const filtered = collections
      .map((collection) => ({
        ...collection,
        cards: collection.cards.filter((card) => {
          if (!matchedCardIds) return true;
          return matchedCardIds.has(card.id);
        })
      }))
      .filter((collection) => collection.cards.length > 0 || !keyword);

    if (activeCollectionId === 'all') {
      return filtered;
    }
    return filtered.filter((collection) => collection.id === activeCollectionId);
  }, [collections, search, activeCollectionId, allCards]);

  // --- Drag-and-drop: collection sorting ---

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

  // --- Drag-and-drop: card sorting ---

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

      const container = document.querySelector(`[data-cards-collection-id="${collection.id}"]`);
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

  // --- Business logic ---

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

    const trashFolder = trashFolderId ? { id: trashFolderId } : await ensureTrashFolder(rootId);

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

  const handleSaveTabs = useCallback(async () => {
    const targetRootId = activeSourceId || tabHubRootId;
    if (!targetRootId) return;
    await saveCurrentWindowTabsToCollection(targetRootId);
    await refresh(activeSourceRef.current);
  }, [activeSourceId, tabHubRootId]);

  const handleAutoOrganize = useCallback(async () => {
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

      const snapshotById = new Map(cardsBefore.map((card) => [card.id, card]));
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
  }, [autoOrganizing, collections, activeSourceId, tabHubRootId, trashFolderId, showUndo]);

  const handleAICategorize = useCallback(async () => {
    if (!collections.length) return;

    // Build bookmarks list with current collection info
    const bookmarks = collections.flatMap((collection) =>
      collection.cards.map((card) => ({
        id: card.id,
        title: card.title,
        url: card.url,
        currentCollection: collection.title
      }))
    );

    if (bookmarks.length === 0) return;

    const existingCols = collections.map((c) => ({ id: c.id, title: c.title }));

    // Open modal in loading state
    setAICategorizeState({ loading: true, suggestions: [], newCollections: [], error: null });

    try {
      const result = await categorizeBookmarks(bookmarks, existingCols);

      // Enrich suggestions with bookmark titles and add status
      const enriched = (result.suggestions || []).map((s) => {
        const card = bookmarks.find((b) => b.id === s.bookmarkId);
        return {
          ...s,
          bookmarkTitle: card?.title || s.bookmarkId,
          status: 'pending'
        };
      });

      setAICategorizeState({
        loading: false,
        suggestions: enriched,
        newCollections: result.newCollections || [],
        error: null
      });
    } catch (err) {
      setAICategorizeState({
        loading: false,
        suggestions: [],
        newCollections: [],
        error: err?.message || 'AI 分类失败'
      });
    }
  }, [collections]);

  const handleAcceptSuggestion = useCallback((idx) => {
    setAICategorizeState((prev) => {
      if (!prev) return prev;
      const next = [...prev.suggestions];
      next[idx] = { ...next[idx], status: 'accepted' };
      return { ...prev, suggestions: next };
    });
  }, []);

  const handleRejectSuggestion = useCallback((idx) => {
    setAICategorizeState((prev) => {
      if (!prev) return prev;
      const next = [...prev.suggestions];
      next[idx] = { ...next[idx], status: 'rejected' };
      return { ...prev, suggestions: next };
    });
  }, []);

  const handleApplyAISuggestions = useCallback(async () => {
    if (!aiCategorizeState) return;

    const accepted = aiCategorizeState.suggestions.filter((s) => s.status === 'accepted');
    if (accepted.length === 0) return;

    // Snapshot for undo
    const snapshots = [];
    for (const suggestion of accepted) {
      const card = allCards.find((c) => c.id === suggestion.bookmarkId);
      if (card) {
        snapshots.push({ id: card.id, parentId: card.parentId, index: card.index });
      }
    }

    // Find or create target collections
    const collectionByTitle = new Map(collections.map((c) => [c.title.toLowerCase(), c]));

    for (const suggestion of accepted) {
      const target = collectionByTitle.get(suggestion.targetCollectionTitle.toLowerCase());
      if (target) {
        await moveBookmark(suggestion.bookmarkId, target.id, target.cards.length);
      }
      // Skip suggestions targeting non-existent collections (new collection creation not supported in mock)
    }

    showUndo(`AI 分类完成：移动了 ${accepted.length} 个书签`, async () => {
      for (const snapshot of sortSnapshots(snapshots)) {
        await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
      }
    });

    setAICategorizeState(null);
    await refresh(activeSourceRef.current);
  }, [aiCategorizeState, allCards, collections, showUndo]);

  const handleCheckDeadLinks = useCallback(async () => {
    const allBookmarks = collections.flatMap((c) => c.cards);
    if (allBookmarks.length === 0) return;

    setDeadLinkState({ loading: true, progress: null, results: null, error: null });

    try {
      const results = await checkDeadLinks(allBookmarks, (progress) => {
        setDeadLinkState((prev) => (prev ? { ...prev, progress } : prev));
      });
      setDeadLinkState({ loading: false, progress: null, results, error: null });
    } catch (err) {
      setDeadLinkState({ loading: false, progress: null, results: null, error: err?.message || '检测失败' });
    }
  }, [collections]);

  const handleDeleteDeadLink = useCallback(
    async (bookmarkId, title) => {
      const card = allCards.find((c) => c.id === bookmarkId);
      if (!card) return;
      const shouldDelete = window.confirm(`删除书签：${title} ?`);
      if (!shouldDelete) return;
      await moveCardsToTrash([card]);
      // Remove from dead link results
      setDeadLinkState((prev) => {
        if (!prev?.results) return prev;
        return { ...prev, results: prev.results.filter((r) => r.bookmarkId !== bookmarkId) };
      });
    },
    [allCards]
  );

  const onToggleManage = useCallback(() => setManageMode((prev) => !prev), []);

  useKeyboardShortcuts({
    searchInputRef,
    onSaveTabs: handleSaveTabs,
    onAutoOrganize: handleAutoOrganize,
    onToggleManage,
    autoOrganizing
  });

  // --- Event handlers ---

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
    setContextMenu({ kind: 'card', x: event.clientX, y: event.clientY, card });
  };

  const openCollectionContextMenu = (event, collection) => {
    if (!collection.editable && !collection.deletable) return;
    event.preventDefault();
    setContextMenu({ kind: 'collection', x: event.clientX, y: event.clientY, collection });
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

    const shouldDelete = window.confirm(`删除目录"${current.title}"及其全部书签？`);
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
      if (target.closest('.card-drag-handle') || target.closest('.card-mini-btn') || target.closest('.card-select')) {
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

  const handleEditorSave = async () => {
    if (!editorState || editorState.saving) return;
    const before = cardById.get(editorState.cardId);
    const targetCollection = collections.find((collection) => collection.id === editorState.targetParentId);
    const nextTitle = editorState.title.trim();
    const nextUrl = editorState.url.trim();
    if (!nextTitle || !nextUrl || !before) return;

    setEditorState((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      await updateBookmark(editorState.cardId, { title: nextTitle, url: nextUrl });

      if (editorState.targetParentId !== editorState.currentParentId && targetCollection) {
        await moveBookmark(editorState.cardId, editorState.targetParentId, targetCollection.cards.length);
      }

      showUndo('书签已更新', async () => {
        await updateBookmark(before.id, { title: before.title, url: before.url });
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

  const handleBatchMoveSave = async () => {
    if (!batchMoveState || batchMoveState.moving || !selectedCards.length) return;
    if (!batchMoveState.targetParentId) return;

    setBatchMoveState((prev) => (prev ? { ...prev, moving: true } : prev));
    try {
      await moveCardsWithUndo(selectedCards, batchMoveState.targetParentId, `已移动 ${selectedCards.length} 个书签`);
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

  // --- Render ---

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      <div className="min-h-screen flex">
        <Sidebar
          sources={sources}
          activeSourceId={activeSourceId}
          onSourceChange={handleSourceChange}
          themeMode={themeMode}
          onThemeModeChange={handleThemeModeChange}
          collections={collections}
          activeCollectionId={activeCollectionId}
          onCollectionSelect={setActiveCollectionId}
          canSortCollections={canSortCollections}
          onCollectionContextMenu={openCollectionContextMenu}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <Toolbar
            activeSource={activeSource}
            activeSourceId={activeSourceId}
            tabHubRootId={tabHubRootId}
            onSaveTabs={handleSaveTabs}
            manageMode={manageMode}
            onToggleManage={onToggleManage}
            autoOrganizing={autoOrganizing}
            onAutoOrganize={handleAutoOrganize}
            onAICategorize={handleAICategorize}
            onCheckDeadLinks={handleCheckDeadLinks}
            search={search}
            onSearchChange={setSearch}
            searchInputRef={searchInputRef}
          />

          {manageMode && (
            <BatchToolbar
              selectedCount={selectedCards.length}
              onBatchMove={openBatchMove}
              onBatchTrash={handleBatchTrash}
              onClearSelections={clearSelections}
            />
          )}

          {loading ? (
            /* Loading skeleton */
            <div className="space-y-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
                >
                  <div className="skeleton h-5 w-40 mb-4" />
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="skeleton h-16 rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border p-6 text-center"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          ) : visibleCollections.length === 0 ? (
            <div
              className="rounded-2xl border p-12 text-center"
              style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
            >
              <div className="text-4xl mb-3">📑</div>
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                暂无可显示书签
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                点击「保存标签页」将当前打开的网页保存到此处
              </div>
            </div>
          ) : (
            <section className="space-y-4" data-module-sortable="true">
              {visibleCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  collapsed={collapsedCollectionIds.has(collection.id)}
                  moduleDraggable={canSortCollections && collection.editable && collection.parentId === activeSourceId}
                  cardDragEnabled={cardDragEnabled}
                  manageMode={manageMode}
                  selectedCardIds={selectedCardIds}
                  onToggleCollapse={toggleCollection}
                  onCardClick={handleCardClick}
                  onCardContextMenu={openCardContextMenu}
                  onEditCard={openEditorByCard}
                  onDeleteCard={handleDeleteCardByCard}
                  onToggleCardSelect={toggleCardSelection}
                />
              ))}
            </section>
          )}
        </main>
      </div>

      <ContextMenu
        contextMenu={contextMenu}
        onEditCard={handleEditCard}
        onDeleteCard={handleDeleteCard}
        onRenameCollection={handleRenameCollection}
        onDeleteCollection={handleDeleteCollection}
      />

      <EditBookmarkModal
        editorState={editorState}
        setEditorState={setEditorState}
        filteredTargets={filteredEditorTargets}
        onSave={handleEditorSave}
        onClose={() => setEditorState(null)}
      />

      <BatchMoveModal
        batchMoveState={batchMoveState}
        setBatchMoveState={setBatchMoveState}
        filteredTargets={filteredBatchTargets}
        selectedCount={selectedCards.length}
        onSave={handleBatchMoveSave}
        onClose={() => setBatchMoveState(null)}
      />

      <DeadLinkModal
        deadLinkState={deadLinkState}
        onDeleteBookmark={handleDeleteDeadLink}
        onClose={() => setDeadLinkState(null)}
      />

      <AICategorizeModal
        aiState={aiCategorizeState}
        onAcceptSuggestion={handleAcceptSuggestion}
        onRejectSuggestion={handleRejectSuggestion}
        onApplyAll={handleApplyAISuggestions}
        onClose={() => setAICategorizeState(null)}
      />

      <UndoToast undoToast={undoToast} onUndo={() => handleUndo(() => refresh(activeSourceRef.current))} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
