import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Sortable from 'sortablejs';
import './index.css';

import {
  addBookmarkToFolder,
  createCollectionFolder,
  ensureTrashFolder,
  exportCollections,
  getCardsForSource,
  getOpenTabs,
  getTrashContents,
  importCollections,
  moveBookmark,
  moveBookmarkToCardPosition,
  openAllInNewTabs,
  openBookmarkInCurrentTab,
  openBookmarkInNewTab,
  removeCollectionFolder,
  renameCollectionFolder,
  saveCurrentWindowTabsToCollection,
  updateBookmark
} from './lib/bookmarkService';
import { logError, normalizeUrlKey, sortSnapshots } from './lib/utils';
import { smartSearch } from './lib/searchService';
import { storageGet, storageSet } from './lib/storage';

import { initLanguage, getLanguageSetting, setLanguage as setI18nLanguage, t } from './lib/i18n';
import { useCollections } from './hooks/useCollections';
import { useTheme } from './hooks/useTheme';
import { useUndoStack } from './hooks/useUndoStack';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { categorizeBookmarks } from './lib/aiService';
import { checkDeadLinks } from './lib/enrichmentService';
import { processChat } from './lib/chatService';

import { Sidebar } from './components/Sidebar';
import { WelcomeCard } from './components/WelcomeCard';
import { Toolbar, BatchToolbar } from './components/Toolbar';
import { CollectionCard } from './components/CollectionCard';
import { ContextMenu } from './components/ContextMenu';
import { EditBookmarkModal } from './components/EditBookmarkModal';
import { BatchMoveModal } from './components/BatchMoveModal';
import { AICategorizeModal } from './components/AICategorizeModal';
import { DeadLinkModal } from './components/DeadLinkModal';
import { ChatPanel, ChatToggle } from './components/ChatPanel';
import { UndoToast } from './components/UndoToast';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { PromptModal } from './components/PromptModal';
import { SaveTabsModal } from './components/SaveTabsModal';

function App() {
  const {
    tabHubRootId,
    sources,
    activeSourceId,
    trashFolderId,
    setTrashFolderId,
    activeSourceRef,
    collections,
    loading,
    error,
    activeSource,
    allCards,
    cardById,
    cardByIdRef,
    refresh,
    initialLoadDoneRef
  } = useCollections();

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashItems, setTrashItems] = useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);
  const [saveTabsState, setSaveTabsState] = useState(null);
  const [crossSourceResults, setCrossSourceResults] = useState([]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [langReady, setLangReady] = useState(false);
  const [languageSetting, setLanguageSetting] = useState('auto');
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [, forceUpdate] = useState(0);

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
  const canSortCollections = dragEnabled && activeCollectionId === 'all';

  const topLevelSortableCollections = useMemo(
    () => collections.filter((c) => c.editable && c.parentId === activeSourceId),
    [collections, activeSourceId]
  );

  const selectedCards = useMemo(
    () =>
      Array.from(selectedCardIds)
        .map((id) => cardById.get(id))
        .filter(Boolean),
    [selectedCardIds, cardById]
  );

  const filteredEditorTargets = useMemo(() => {
    if (!editorState) return [];
    const keyword = editorState.folderQuery.trim().toLowerCase();
    if (!keyword) return collections;
    return collections.filter((c) => c.title.toLowerCase().includes(keyword));
  }, [editorState, collections]);

  const filteredBatchTargets = useMemo(() => {
    if (!batchMoveState) return [];
    const keyword = batchMoveState.folderQuery.trim().toLowerCase();
    if (!keyword) return collections;
    return collections.filter((c) => c.title.toLowerCase().includes(keyword));
  }, [batchMoveState, collections]);

  // --- Initialization ---
  useEffect(() => {
    (async () => {
      await initLanguage();
      const savedLang = await getLanguageSetting();
      setLanguageSetting(savedLang || 'auto');
      setLangReady(true);
    })();

    (async () => {
      const [savedCollection, savedCollapsed, savedOnboarding] = await Promise.all([
        storageGet('tabhub_active_collection').catch(() => undefined),
        storageGet('tabhub_sidebar_collapsed').catch(() => undefined),
        storageGet('tabhub_onboarding_dismissed').catch(() => undefined)
      ]);

      if (typeof savedCollapsed === 'boolean') {
        setSidebarCollapsed(savedCollapsed);
      }
      if (savedCollection) {
        setActiveCollectionId(savedCollection);
      }
      if (savedOnboarding === true) {
        setOnboardingDismissed(true);
      }
    })();
  }, []);

  // --- Persist active state to storage ---
  useEffect(() => {
    if (initialLoadDoneRef.current && activeCollectionId) {
      storageSet('tabhub_active_collection', activeCollectionId).catch(logError);
    }
  }, [activeCollectionId, initialLoadDoneRef]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      storageSet('tabhub_sidebar_collapsed', sidebarCollapsed).catch(logError);
    }
  }, [sidebarCollapsed, initialLoadDoneRef]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, []);

  // --- Cleanup timers ---
  useEffect(
    () => () => {
      if (dragReleaseTimerRef.current) {
        clearTimeout(dragReleaseTimerRef.current);
        dragReleaseTimerRef.current = null;
      }
    },
    []
  );

  // --- Suppress card click after drag ---
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

  // --- Keyboard shortcuts ---
  useEffect(() => {
    setSelectedCardIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => cardById.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [cardById]);

  // --- Exit manage mode clears selection ---
  useEffect(() => {
    if (!manageMode) {
      setSelectedCardIds(new Set());
      setBatchMoveState(null);
    }
  }, [manageMode]);

  // --- Visible collections ---

  // Deferred: the O(N) scan and full list re-render lag behind fast typing
  // instead of blocking each keystroke.
  const deferredSearch = useDeferredValue(search);

  const visibleCollections = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

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
  }, [collections, deferredSearch, activeCollectionId, allCards]);

  // --- Cross-source search ---
  const visibleCardCount = useMemo(
    () => visibleCollections.reduce((sum, c) => sum + c.cards.length, 0),
    [visibleCollections]
  );

  useEffect(() => {
    const keyword = search.trim();
    if (!keyword || visibleCardCount >= 3 || sources.length <= 1) {
      setCrossSourceResults([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const otherSources = sources.filter((s) => s.id !== activeSourceId);
      const results = [];

      for (const source of otherSources) {
        const cards = await getCardsForSource(source.id);
        if (cancelled) return;
        const matches = smartSearch(keyword, cards);
        if (matches.length > 0) {
          results.push({
            sourceName: source.title,
            sourceId: source.id,
            cards: matches.slice(0, 5).map((m) => m.bookmark)
          });
        }
      }

      if (!cancelled) {
        setCrossSourceResults(results);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [search, visibleCardCount, sources, activeSourceId]);

  // --- Drag-and-drop: collection sorting ---

  const persistTopLevelCollectionOrder = useCallback(
    async (orderedIds) => {
      const sortableMap = new Map(topLevelSortableCollections.map((collection) => [collection.id, collection]));
      const filteredIds = orderedIds.filter((id) => sortableMap.has(id));
      if (filteredIds.length < 2) return;

      const baseIndex = Math.min(...filteredIds.map((id) => sortableMap.get(id).index ?? 0));
      for (let i = 0; i < filteredIds.length; i += 1) {
        const collectionId = filteredIds[i];
        await moveBookmark(collectionId, activeSourceId, baseIndex + i);
      }
      await refresh(activeSourceRef.current);
    },
    [topLevelSortableCollections, activeSourceId, refresh]
  );

  // --- SortableJS: Nav sidebar ---
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
  }, [canSortCollections, topLevelSortableCollections, activeSourceId, persistTopLevelCollectionOrder]);

  // --- SortableJS: Module (collection) sorting ---
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
  }, [canSortCollections, topLevelSortableCollections, activeSourceId, visibleCollections, persistTopLevelCollectionOrder]);

  // --- Drag-and-drop: card sorting ---

  // --- SortableJS: Card-level drag (FIXED: no hard reload) ---
  useEffect(() => {
    // Safe destroy helper — SortableJS may throw if DOM elements are already gone
    const safeDestroyAll = () => {
      for (const s of cardSortablesRef.current.values()) {
        try { s.destroy(); } catch (err) { logError('safeDestroyAll', err); }
      }
      cardSortablesRef.current.clear();
    };

    if (!cardDragEnabled) {
      safeDestroyAll();
      return;
    }

    // Destroy all existing card Sortable instances before re-creating.
    // This prevents stale instances from accumulating when the effect re-runs.
    safeDestroyAll();

    // Defer initialization to ensure DOM is fully painted.
    // Chrome new tab pages may pre-render, causing querySelector to miss elements.
    const rafId = requestAnimationFrame(() => {
      visibleCollections.forEach((collection) => {
        if (collapsedCollectionIds.has(collection.id)) return;

      const container = document.querySelector(`[data-cards-collection-id="${collection.id}"]`);
      if (!container || !container.parentNode) {
        return;
      }

      let sortable;
      try {
        sortable = new Sortable(container, {
          animation: 150,
          draggable: '[data-card-id]',
          handle: '.card-drag-handle',
          group: {
            name: 'bookmark-cards',
            pull: true,
            put: true
          },
          emptyInsertThreshold: 28,
          ghostClass: 'card-dragging',
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
            const { oldIndex, newIndex } = evt;
            suppressCardOpenUntilRef.current = Date.now() + 1800;
            suppressNextCardClickRef.current = true;

            // Revert SortableJS's DOM mutation before React reconciles
            if (evt.from !== evt.to) {
              evt.to.removeChild(evt.item);
              if (evt.from.children[oldIndex]) {
                evt.from.insertBefore(evt.item, evt.from.children[oldIndex]);
              } else {
                evt.from.appendChild(evt.item);
              }
            } else {
              // Same-container: after an upward drag the item sits before its old
              // slot, so the element that should follow it is at oldIndex + 1.
              const refNode = evt.from.children[newIndex < oldIndex ? oldIndex + 1 : oldIndex];
              if (refNode) {
                evt.from.insertBefore(evt.item, refNode);
              } else {
                evt.from.appendChild(evt.item);
              }
            }

            try {
              if (!bookmarkId || !oldParentId || !newParentId || newIndex == null) {
                return;
              }
              if (oldParentId === newParentId && oldIndex === newIndex) {
                return;
              }

              const draggedCard = cardById.get(bookmarkId);
              const oldChromeIndex = draggedCard?.index ?? oldIndex;

              // Translate DOM newIndex to Chrome bookmark index
              const targetCollectionId = evt.to.getAttribute('data-cards-collection-id');
              const targetCol = visibleCollections.find((c) => c.id === targetCollectionId);
              let chromeNewIndex;
              if (targetCol && targetCol.cards.length > 0) {
                if (newIndex < targetCol.cards.length) {
                  chromeNewIndex = targetCol.cards[newIndex].index;
                } else {
                  const lastCard = targetCol.cards[targetCol.cards.length - 1];
                  chromeNewIndex = lastCard.index + 1;
                }
              } else {
                chromeNewIndex = newIndex;
              }

              await moveBookmark(bookmarkId, newParentId, chromeNewIndex);

              showUndo(t('movedBookmarks', 1), async () => {
                await moveBookmark(bookmarkId, oldParentId, oldChromeIndex);
              });

              for (const s of cardSortablesRef.current.values()) {
                try { s.destroy(); } catch (err) { logError('cardDrag.destroySortable', err); }
              }
              cardSortablesRef.current.clear();

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
      } catch (err) {
        // SortableJS can throw if DOM elements are detached during pre-render
        logError('cardSortable.init', err);
        return;
      }

        cardSortablesRef.current.set(collection.id, sortable);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      safeDestroyAll();
    };
  }, [cardDragEnabled, visibleCollections, collapsedCollectionIds, showUndo, refresh, cardById]);

  // --- Business logic ---

  const moveCardsWithUndo = useCallback(
    async (cards, targetParentId, undoLabel) => {
      if (!cards.length) return;
      const snapshots = cards.map((card) => ({
        id: card.id,
        title: card.title,
        parentId: card.parentId,
        index: card.index
      }));

      try {
        const targetCollection = collections.find((collection) => collection.id === targetParentId);
        let insertIndex = 0;
        if (targetCollection && targetCollection.cards.length > 0) {
          const lastCard = targetCollection.cards[targetCollection.cards.length - 1];
          insertIndex = lastCard.index + 1;
        }

        for (const card of cards) {
          await moveBookmark(card.id, targetParentId, insertIndex);
          insertIndex += 1;
        }

        showUndo(undoLabel, async () => {
          for (const snapshot of sortSnapshots(snapshots)) {
            await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
          }
        });
      } catch (err) {
        logError('moveCardsWithUndo', err);
      } finally {
        await refresh(activeSourceRef.current);
      }
    },
    [collections, showUndo, refresh]
  );

  const moveCardsToTrash = useCallback(
    async (cards) => {
      if (!cards.length) return;

      if (!tabHubRootId) return;

      try {
        const trashFolder = trashFolderId ? { id: trashFolderId } : await ensureTrashFolder(tabHubRootId);
        if (!trashFolderId) setTrashFolderId(trashFolder.id);

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

        showUndo(t('movedToTrash', cards.length), async () => {
          for (const snapshot of sortSnapshots(snapshots)) {
            await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
          }
        });
      } catch (err) {
        logError('moveCardsToTrash', err);
      } finally {
        await refresh(activeSourceRef.current);
      }
    },
    [tabHubRootId, trashFolderId, showUndo, refresh]
  );

  const openEditorByCard = useCallback((card) => {
    setEditorState({
      cardId: card.id,
      title: card.title,
      url: card.url,
      currentParentId: card.parentId,
      targetParentId: card.parentId,
      folderQuery: '',
      saving: false
    });
  }, []);

  const handleSaveTabs = useCallback(async () => {
    const openTabs = await getOpenTabs();
    if (openTabs.length === 0) return;
    const folderName = new Date().toISOString().slice(0, 19).replace('T', ' ');
    setSaveTabsState({ tabs: openTabs, folderName });
  }, []);

  const handleSaveTabsConfirm = useCallback(
    async ({ selectedTabIds, folderName, targetCollectionId }) => {
      if (!saveTabsState) return;
      const selectedTabs = saveTabsState.tabs.filter((tab) => selectedTabIds.has(tab.id));
      if (selectedTabs.length === 0) return;

      try {
        if (targetCollectionId) {
          // Save directly into an existing collection
          await Promise.all(
            selectedTabs.map((tab) => addBookmarkToFolder(targetCollectionId, tab.title || tab.url, tab.url))
          );
        } else {
          // New collection — create a named folder under the active source
          const rootId = activeSourceId || tabHubRootId;
          if (!rootId) return;
          const name = folderName || new Date().toISOString().slice(0, 19).replace('T', ' ');
          await saveCurrentWindowTabsToCollection(rootId, { tabs: selectedTabs, folderName: name });
        }

        showUndo(t('savedTabs', selectedTabs.length), null);
        await refresh(activeSourceRef.current);
      } finally {
        setSaveTabsState(null);
      }
    },
    [saveTabsState, activeSourceId, tabHubRootId, showUndo, refresh]
  );

  const handleAutoOrganize = useCallback(async () => {
    if (autoOrganizing || !collections.length) return;
    if (!tabHubRootId) return;

    setAutoOrganizing(true);
    try {
      const trashFolder = trashFolderId ? { id: trashFolderId } : await ensureTrashFolder(tabHubRootId);
      if (!trashFolderId) setTrashFolderId(trashFolder.id);
      const cardsBefore = collections.flatMap((c) =>
        c.cards.map((card) => ({ id: card.id, title: card.title, url: card.url, parentId: card.parentId, index: card.index }))
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
        showUndo(t('autoOrganizeResult', duplicates.length, sortedMoves), async () => {
          for (const snapshot of sortSnapshots(Array.from(snapshotById.values()))) {
            await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
          }
        });
      }

      await refresh(activeSourceRef.current);
    } catch (err) {
      logError('handleAutoOrganize', err);
      await refresh(activeSourceRef.current);
    } finally {
      setAutoOrganizing(false);
    }
  }, [autoOrganizing, collections, tabHubRootId, trashFolderId, showUndo, refresh]);

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

      // Functional guard: if the user closed the modal while we awaited,
      // don't re-open it with late results.
      setAICategorizeState((prev) =>
        prev
          ? {
              loading: false,
              suggestions: enriched,
              newCollections: result.newCollections || [],
              error: null
            }
          : prev
      );
    } catch (err) {
      setAICategorizeState((prev) =>
        prev
          ? {
              loading: false,
              suggestions: [],
              newCollections: [],
              error: err?.message || t('aiCategorizeFailed')
            }
          : prev
      );
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

    try {
      const snapshots = [];
      for (const suggestion of accepted) {
        const card = allCards.find((c) => c.id === suggestion.bookmarkId);
        if (card) {
          snapshots.push({ id: card.id, parentId: card.parentId, index: card.index });
        }
      }

      const collectionByTitle = new Map(collections.map((c) => [c.title.toLowerCase(), c]));
      let movedCount = 0;

      for (const suggestion of accepted) {
        const target = collectionByTitle.get(suggestion.targetCollectionTitle.toLowerCase());
        if (target) {
          await moveBookmark(suggestion.bookmarkId, target.id, target.cards.length + movedCount);
          movedCount++;
        }
      }

      if (movedCount > 0) {
        showUndo(t('aiCategorizeComplete', movedCount), async () => {
          for (const snapshot of sortSnapshots(snapshots)) {
            await moveBookmark(snapshot.id, snapshot.parentId, snapshot.index ?? 0);
          }
        });
      }
    } catch (err) {
      logError('handleApplyAISuggestions', err);
    } finally {
      setAICategorizeState(null);
      await refresh(activeSourceRef.current);
    }
  }, [aiCategorizeState, allCards, collections, showUndo, refresh]);

  const handleCheckDeadLinks = useCallback(async () => {
    const allBookmarks = collections.flatMap((c) => c.cards);
    if (allBookmarks.length === 0) return;

    setDeadLinkState({ loading: true, progress: null, results: null, error: null });

    try {
      const results = await checkDeadLinks(allBookmarks, (progress) => {
        setDeadLinkState((prev) => (prev ? { ...prev, progress } : prev));
      });
      // Functional guard: never re-open the modal the user already closed.
      setDeadLinkState((prev) => (prev ? { loading: false, progress: null, results, error: null } : prev));
    } catch (err) {
      setDeadLinkState((prev) =>
        prev ? { loading: false, progress: null, results: null, error: err?.message || t('deadLinkCheckFailed') } : prev
      );
    }
  }, [collections]);

  const handleDeleteDeadLink = useCallback(
    async (bookmarkId, title) => {
      const card = allCards.find((c) => c.id === bookmarkId);
      if (!card) return;
      setConfirmDialog({
        title: t('deleteBookmarkTitle'),
        message: t('confirmDeleteBookmark', title),
        danger: true,
        onConfirm: async () => {
          setConfirmDialog(null);
          await moveCardsToTrash([card]);
          setDeadLinkState((prev) => {
            if (!prev?.results) return prev;
            return { ...prev, results: prev.results.filter((r) => r.bookmarkId !== bookmarkId) };
          });
        }
      });
    },
    [allCards, moveCardsToTrash]
  );

  const handleNewCollection = useCallback(() => {
    const rootId = activeSourceId || tabHubRootId;
    if (!rootId) return;
    setPromptDialog({
      title: t('newCollectionTitle'),
      placeholder: t('newCollectionPrompt'),
      defaultValue: '',
      onConfirm: async (value) => {
        setPromptDialog(null);
        await createCollectionFolder(rootId, value);
        await refresh(activeSourceRef.current);
      }
    });
  }, [activeSourceId, tabHubRootId, refresh]);

  const handleDismissOnboarding = useCallback(async () => {
    setOnboardingDismissed(true);
    await storageSet('tabhub_onboarding_dismissed', true).catch(logError);
  }, []);

  // Show onboarding when there are zero user-created collections and not dismissed
  const showOnboarding = useMemo(() => {
    if (onboardingDismissed || loading) return false;
    // Check if there are any editable collections (user-created, excluding system folders)
    const userCollections = collections.filter((c) => c.editable);
    return userCollections.length === 0;
  }, [onboardingDismissed, loading, collections]);

  const handleExport = useCallback(() => {
    const jsonString = exportCollections(collections);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabhub-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showUndo(t('exportSuccess', collections.length), null);
  }, [collections, showUndo]);

  const handleImport = useCallback(async (jsonString) => {
    try {
      const parentId = activeSourceId || tabHubRootId;
      if (!parentId) return;
      const result = await importCollections(jsonString, parentId);
      showUndo(t('importSuccess', result.collectionsCreated, result.bookmarksCreated), null);
      await refresh(activeSourceRef.current);
    } catch (err) {
      logError('handleImport', err);
      showUndo(t('importFailed', err?.message || t('invalidImportFile')), null);
    }
  }, [activeSourceId, tabHubRootId, showUndo, refresh]);

  const handleViewTrash = useCallback(async () => {
    if (!tabHubRootId) return;
    const { items } = await getTrashContents(tabHubRootId);
    setTrashItems(items);
    setShowTrash(true);
  }, [tabHubRootId]);

  const handleRestoreFromTrash = useCallback(async (item) => {
    const rootId = activeSourceId || tabHubRootId;
    if (!rootId) return;
    await moveBookmark(item.id, rootId, 0);
    showUndo(t('restoredBookmark'), async () => {
      if (trashFolderId) await moveBookmark(item.id, trashFolderId, 0);
    });
    const { items } = await getTrashContents(tabHubRootId);
    setTrashItems(items);
    await refresh(activeSourceRef.current);
  }, [activeSourceId, tabHubRootId, trashFolderId, showUndo, refresh]);

  const handleEmptyTrash = useCallback(() => {
    if (!trashFolderId) return;
    setConfirmDialog({
      title: t('emptyTrashTitle'),
      message: t('confirmEmptyTrash'),
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        await removeCollectionFolder(trashFolderId);
        setTrashFolderId('');
        setTrashItems([]);
        setShowTrash(false);
        showUndo(t('trashEmptied'), null);
        await refresh(activeSourceRef.current);
      }
    });
  }, [trashFolderId, showUndo, refresh]);

  const handleChatMessage = useCallback(
    async (text) => {
      // Add user message
      setChatMessages((prev) => [...prev, { role: 'user', text }]);

      const context = { collections, allCards };
      const result = await processChat(text, context);

      // Build assistant message
      const assistantMsg = {
        role: 'assistant',
        text: result.message,
        results: result.results,
        action: result.action
      };

      // Add confirm handler for actionable results. Confirms run later (or
      // never): resolve ids against the LATEST cards via allCardsRef, and a
      // closure flag makes a double click a no-op instead of a double delete.
      if (result.action === 'move' && result.results?.length && result.targetCollectionId) {
        let executed = false;
        assistantMsg.onConfirm = async () => {
          if (executed) return;
          executed = true;
          const currentMap = cardByIdRef.current;
          const cards = result.results
            .map((r) => currentMap.get(r.id))
            .filter(Boolean);
          if (cards.length > 0) {
            await moveCardsWithUndo(cards, result.targetCollectionId, t('movedBookmarks', cards.length));
            setChatMessages((prev) => [
              ...prev,
              { role: 'assistant', text: t('chatMovedBookmarks', cards.length, result.targetCollectionTitle) }
            ]);
          }
        };
      } else if (result.action === 'delete' && result.results?.length) {
        let executed = false;
        assistantMsg.onConfirm = async () => {
          if (executed) return;
          executed = true;
          const currentMap = cardByIdRef.current;
          const cards = result.results
            .map((r) => currentMap.get(r.id))
            .filter(Boolean);
          if (cards.length > 0) {
            await moveCardsToTrash(cards);
            setChatMessages((prev) => [
              ...prev,
              { role: 'assistant', text: t('chatDeletedBookmarks', cards.length) }
            ]);
          }
        };
      }

      setChatMessages((prev) => [...prev, assistantMsg]);
    },
    [collections, allCards, cardByIdRef, moveCardsWithUndo, moveCardsToTrash]
  );

  const handleTagClick = useCallback((tag) => {
    setSearch(tag);
  }, []);

  const onToggleManage = useCallback(() => setManageMode((prev) => !prev), []);

  const modalOpen = !!(contextMenu || editorState || batchMoveState || aiCategorizeState || deadLinkState);

  const handleEscape = useCallback(() => {
    // Close the topmost overlay only.
    if (contextMenu) {
      setContextMenu(null);
    } else if (editorState) {
      setEditorState(null);
    } else if (batchMoveState) {
      setBatchMoveState(null);
    } else if (aiCategorizeState) {
      setAICategorizeState(null);
    } else if (deadLinkState) {
      setDeadLinkState(null);
    } else if (chatOpen) {
      setChatOpen(false);
    }
  }, [contextMenu, editorState, batchMoveState, aiCategorizeState, deadLinkState, chatOpen]);

  useKeyboardShortcuts({
    searchInputRef,
    onSaveTabs: handleSaveTabs,
    onAutoOrganize: handleAutoOrganize,
    onToggleManage,
    autoOrganizing,
    disabled: modalOpen,
    onEscape: handleEscape
  });

  // --- Event handlers ---

  const handleSourceChange = async (sourceId) => {
    setActiveCollectionId('all');
    setCollapsedCollectionIds(new Set());
    await refresh(sourceId);
  };

  const handleLanguageChange = async (lang) => {
    setLanguageSetting(lang);
    await setI18nLanguage(lang);
    forceUpdate((n) => n + 1);
  };

  // Stable identities: these flow into React.memo'd CollectionCard/BookmarkCard,
  // where a fresh function per render would defeat the memo entirely.
  const toggleCollection = useCallback((collectionId) => {
    setCollapsedCollectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  }, []);

  const toggleCardSelection = useCallback((cardId) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const clearSelections = useCallback(() => setSelectedCardIds(new Set()), []);

  const openCardContextMenu = useCallback((event, card) => {
    event.preventDefault();
    setContextMenu({ kind: 'card', x: event.clientX, y: event.clientY, card });
  }, []);

  const openCollectionContextMenu = useCallback((event, collection) => {
    if (!collection.editable && !collection.deletable) return;
    event.preventDefault();
    setContextMenu({ kind: 'collection', x: event.clientX, y: event.clientY, collection });
  }, []);

  const handleEditCard = async () => {
    if (contextMenu?.kind !== 'card' || !contextMenu.card) return;
    const current = contextMenu.card;
    setContextMenu(null);
    openEditorByCard(current);
  };

  const handleDeleteCardByCard = (card) => {
    setConfirmDialog({
      title: t('deleteBookmarkTitle'),
      message: t('confirmDeleteBookmark', card.title),
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        await moveCardsToTrash([card]);
      }
    });
  };

  const handleDeleteCard = async () => {
    if (contextMenu?.kind !== 'card' || !contextMenu.card) return;
    const current = contextMenu.card;
    setContextMenu(null);
    await handleDeleteCardByCard(current);
  };

  const handleRenameCollection = () => {
    if (contextMenu?.kind !== 'collection' || !contextMenu.collection?.editable) return;
    const current = contextMenu.collection;
    setContextMenu(null);

    setPromptDialog({
      title: t('renameCollectionTitle'),
      placeholder: t('renamePrompt'),
      defaultValue: current.folderTitle || current.title,
      onConfirm: async (value) => {
        setPromptDialog(null);
        await renameCollectionFolder(current.id, value);
        await refresh(activeSourceRef.current);
      }
    });
  };

  const handleDeleteCollection = () => {
    if (contextMenu?.kind !== 'collection' || !contextMenu.collection?.deletable) return;
    const current = contextMenu.collection;
    setContextMenu(null);

    setConfirmDialog({
      title: t('deleteCollectionTitle'),
      message: t('confirmDeleteFolder', current.title),
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        await removeCollectionFolder(current.id);
        if (activeCollectionId === current.id) {
          setActiveCollectionId('all');
        }
        await refresh(activeSourceRef.current);
      }
    });
  };

  const handleCardClick = useCallback(
    async (event, card) => {
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

      if (event.ctrlKey || event.metaKey || event.button === 1) {
        await openBookmarkInNewTab(card.url);
        return;
      }

      await openBookmarkInCurrentTab(card.url);
    },
    [manageMode, toggleCardSelection]
  );

  const handleOpenAllInCollection = useCallback(
    async (collectionId) => {
      const collection = collections.find((c) => c.id === collectionId);
      if (!collection || collection.cards.length === 0) return;
      const urls = collection.cards.map((card) => card.url).filter(Boolean);
      if (urls.length > 0) {
        await openAllInNewTabs(urls);
      }
    },
    [collections]
  );

  const handleOpenInNewTab = async () => {
    if (contextMenu?.kind !== 'card' || !contextMenu.card) return;
    const url = contextMenu.card.url;
    setContextMenu(null);
    if (url) {
      await openBookmarkInNewTab(url);
    }
  };

  const handleEditorSave = async () => {
    if (!editorState || editorState.saving) return;
    const before = cardById.get(editorState.cardId);
    const targetCollection = collections.find((c) => c.id === editorState.targetParentId);
    const nextTitle = editorState.title.trim();
    const nextUrl = editorState.url.trim();
    if (!nextTitle || !nextUrl || !before) return;

    setEditorState((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      await updateBookmark(editorState.cardId, { title: nextTitle, url: nextUrl });

      if (editorState.targetParentId !== editorState.currentParentId && targetCollection) {
        await moveBookmarkToCardPosition(editorState.cardId, editorState.targetParentId, null);
      }

      showUndo(t('bookmarkUpdated'), async () => {
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
      await moveCardsWithUndo(selectedCards, batchMoveState.targetParentId, t('movedBookmarks', selectedCards.length));
      clearSelections();
      setBatchMoveState(null);
    } finally {
      setBatchMoveState((prev) => (prev ? { ...prev, moving: false } : prev));
    }
  };

  const handleBatchTrash = () => {
    if (!selectedCards.length) return;
    setConfirmDialog({
      title: t('batchTrashTitle'),
      message: t('confirmBatchTrash', selectedCards.length),
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        await moveCardsToTrash(selectedCards);
        clearSelections();
      }
    });
  };

  // --- Render ---

  if (!langReady) return null;

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      <div className="min-h-screen flex">
        <Sidebar
          sources={sources}
          activeSourceId={activeSourceId}
          onSourceChange={handleSourceChange}
          themeMode={themeMode}
          onThemeModeChange={handleThemeModeChange}
          languageSetting={languageSetting}
          onLanguageChange={handleLanguageChange}
          collections={collections}
          activeCollectionId={activeCollectionId}
          onCollectionSelect={setActiveCollectionId}
          canSortCollections={canSortCollections}
          onCollectionContextMenu={openCollectionContextMenu}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          onViewTrash={handleViewTrash}
          onOpenSettings={() => setSettingsOpen(true)}
          hasTrash={!!trashFolderId}
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
            onNewCollection={handleNewCollection}
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
            showOnboarding ? (
              <WelcomeCard
                onSaveTabs={handleSaveTabs}
                onCreateCollection={handleNewCollection}
                onConnectAI={() => setSettingsOpen(true)}
                onDismiss={handleDismissOnboarding}
              />
            ) : (
              <div
                className="rounded-2xl border p-12 text-center"
                style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
              >
                <div className="text-4xl mb-3">📑</div>
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('noBookmarks')}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {t('noBookmarksHint')}
                </div>
              </div>
            )
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
                  onOpenAll={handleOpenAllInCollection}
                  onTagClick={handleTagClick}
                />
              ))}
            </section>
          )}

          {/* Cross-source search results */}
          {crossSourceResults.length > 0 && (
            <section className="mt-6">
              <h3
                className="text-xs font-semibold uppercase tracking-wide mb-3 px-1"
                style={{ color: 'var(--muted)' }}
              >
                {t('otherSourceResults')}
              </h3>
              {crossSourceResults.map((group) => (
                <div
                  key={group.sourceId}
                  className="mb-4 rounded-2xl border overflow-hidden"
                  style={{
                    background: 'var(--panel-bg)',
                    borderColor: 'var(--panel-border)',
                    boxShadow: 'var(--shadow)'
                  }}
                >
                  <div
                    className="px-4 py-2 text-xs font-medium"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--panel-border)' }}
                  >
                    {t('fromSource', group.sourceName)}
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {group.cards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--card-bg)' }}
                        onClick={() => openBookmarkInCurrentTab(card.url)}
                        title={card.url}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate" style={{ color: 'var(--text)' }}>
                            {card.title}
                          </div>
                          <div className="text-[0.7rem] truncate" style={{ color: 'var(--muted)' }}>
                            {card.url}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>

      <ContextMenu
        contextMenu={contextMenu}
        onOpenNewTab={handleOpenInNewTab}
        onEditCard={handleEditCard}
        onDeleteCard={handleDeleteCard}
        onRenameCollection={handleRenameCollection}
        onDeleteCollection={handleDeleteCollection}
        onClose={() => setContextMenu(null)}
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

      <SaveTabsModal
        open={!!saveTabsState}
        tabs={saveTabsState?.tabs || null}
        defaultFolderName={saveTabsState?.folderName || ''}
        collections={collections}
        onSave={handleSaveTabsConfirm}
        onClose={() => setSaveTabsState(null)}
      />

      {chatOpen ? (
        <ChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onSendMessage={handleChatMessage}
          messages={chatMessages}
        />
      ) : (
        <ChatToggle onClick={() => setChatOpen(true)} />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onExport={handleExport}
        onImport={handleImport}
      />

      {showTrash && trashItems && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => e.target === e.currentTarget && setShowTrash(false)}
        >
          <div
            className="rounded-2xl border shadow-xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col animate-fade-in"
            style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--panel-border)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{t('trash')}</h2>
              <div className="flex gap-2">
                {trashItems.length > 0 && (
                  <button
                    onClick={handleEmptyTrash}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                  >
                    {t('emptyTrash')}
                  </button>
                )}
                <button onClick={() => setShowTrash(false)} className="text-sm" style={{ color: 'var(--muted)' }}>{t('close')}</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {trashItems.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>{t('trashEmpty')}</p>
              ) : (
                <div className="space-y-2">
                  {trashItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate" style={{ color: 'var(--text)' }}>{item.title}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{item.url}</div>
                      </div>
                      <button
                        onClick={() => handleRestoreFromTrash(item)}
                        className="px-2 py-1 rounded text-xs font-medium flex-shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        {t('restore')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDialog}
        {...(confirmDialog || {})}
        onCancel={() => setConfirmDialog(null)}
      />
      <PromptModal
        open={!!promptDialog}
        {...(promptDialog || {})}
        onCancel={() => setPromptDialog(null)}
      />

      <UndoToast undoToast={undoToast} onUndo={() => handleUndo(() => refresh(activeSourceRef.current))} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
