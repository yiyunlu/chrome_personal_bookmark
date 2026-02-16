import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import { initLanguage, getLanguageSetting, setLanguage as setI18nLanguage, t } from './lib/i18n';
import { useTheme } from './hooks/useTheme';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import CollectionCard from './components/CollectionCard';
import ContextMenu from './components/ContextMenu';
import EditBookmarkModal from './components/EditBookmarkModal';
import BatchMoveModal from './components/BatchMoveModal';
import UndoToast from './components/UndoToast';

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

  const [contextMenu, setContextMenu] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [editorState, setEditorState] = useState(null);
  const [batchMoveState, setBatchMoveState] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const [autoOrganizing, setAutoOrganizing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [langReady, setLangReady] = useState(false);
  const [languageSetting, setLanguageSetting] = useState('auto');
  const [, forceUpdate] = useState(0);

  const { themeMode, handleThemeModeChange } = useTheme();

  const navSortableRef = useRef(null);
  const moduleSortableRef = useRef(null);
  const cardSortablesRef = useRef(new Map());
  const undoTimerRef = useRef(null);
  const dragReleaseTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const cardDragActiveRef = useRef(false);
  const suppressCardOpenUntilRef = useRef(0);
  const suppressNextCardClickRef = useRef(false);
  const handleSaveTabsRef = useRef(null);
  const handleAutoOrganizeRef = useRef(null);

  const dragEnabled = search.trim() === '';
  const cardDragEnabled = dragEnabled && !manageMode;
  const activeSource = sources.find((source) => source.id === activeSourceId) || null;
  const canSortCollections = dragEnabled && activeCollectionId === 'all';

  const topLevelSortableCollections = useMemo(
    () => collections.filter((c) => c.editable && c.parentId === activeSourceId),
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

  // --- Data refresh ---
  const refresh = useCallback(async (preferredSourceId = activeSourceRef.current) => {
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
  }, []);

  // --- Undo ---
  const showUndo = useCallback((message, undo) => {
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
  }, []);

  const handleUndo = useCallback(async () => {
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
  }, [undoToast, refresh]);

  // --- Init ---
  useEffect(() => {
    (async () => {
      await initLanguage();
      const savedLang = await getLanguageSetting();
      setLanguageSetting(savedLang || 'auto');
      setLangReady(true);
    })();

    refresh();
    const unsubscribe = subscribeBookmarksChanges(() => {
      refresh(activeSourceRef.current);
    });

    return () => {
      unsubscribe();
    };
  }, [refresh]);

  // --- Context menu close ---
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
        handleSaveTabsRef.current?.();
      } else if (key === 'o') {
        event.preventDefault();
        handleAutoOrganizeRef.current?.();
      } else if (key === 'm') {
        event.preventDefault();
        setManageMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // --- Sync selected cards with available cards ---
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

  // --- Visible collections (filtered by search & active selection) ---
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

  // --- Collection order persistence ---
  const persistTopLevelCollectionOrder = async (orderedIds) => {
    const sortableMap = new Map(topLevelSortableCollections.map((c) => [c.id, c]));
    const filteredIds = orderedIds.filter((id) => sortableMap.has(id));
    if (filteredIds.length < 2) return;

    const baseIndex = Math.min(...filteredIds.map((id) => sortableMap.get(id).index ?? 0));
    for (let i = 0; i < filteredIds.length; i += 1) {
      await moveBookmark(filteredIds[i], activeSourceId, baseIndex + i);
    }
    await refresh(activeSourceRef.current);
  };

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
  }, [canSortCollections, topLevelSortableCollections, activeSourceId]);

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
  }, [canSortCollections, topLevelSortableCollections, activeSourceId, visibleCollections]);

  // --- SortableJS: Card-level drag (FIXED: no hard reload) ---
  useEffect(() => {
    if (!cardDragEnabled) {
      for (const sortable of cardSortablesRef.current.values()) {
        sortable.destroy();
      }
      cardSortablesRef.current.clear();
      return;
    }

    // Destroy all existing card Sortable instances before re-creating.
    // This prevents stale instances from accumulating when the effect re-runs.
    for (const sortable of cardSortablesRef.current.values()) {
      sortable.destroy();
    }
    cardSortablesRef.current.clear();

    // Defer initialization to ensure DOM is fully painted.
    // Chrome new tab pages may pre-render, causing querySelector to miss elements.
    const rafId = requestAnimationFrame(() => {
      visibleCollections.forEach((collection) => {
        if (collapsedCollectionIds.has(collection.id)) return;

        const container = document.querySelector(`[data-cards-collection-id=\"${collection.id}\"]`);
        if (!container) {
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
            const { oldIndex, newIndex } = evt;
            suppressCardOpenUntilRef.current = Date.now() + 1800;
            suppressNextCardClickRef.current = true;

            // ── CRITICAL: Revert SortableJS's DOM mutation ──
            // SortableJS has already physically moved evt.item in the DOM.
            // We MUST put it back before React tries to reconcile, otherwise
            // React's virtual DOM will be out of sync → removeChild crash → blank page.
            if (evt.from !== evt.to) {
              evt.to.removeChild(evt.item);
              if (evt.from.children[oldIndex]) {
                evt.from.insertBefore(evt.item, evt.from.children[oldIndex]);
              } else {
                evt.from.appendChild(evt.item);
              }
            } else {
              const refNode = evt.from.children[oldIndex];
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

              await moveBookmark(bookmarkId, newParentId, newIndex);

              showUndo(t('movedBookmarks', 1), async () => {
                await moveBookmark(bookmarkId, oldParentId, oldIndex ?? 0);
              });

              for (const s of cardSortablesRef.current.values()) {
                s.destroy();
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

        cardSortablesRef.current.set(collection.id, sortable);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      for (const sortable of cardSortablesRef.current.values()) {
        sortable.destroy();
      }
      cardSortablesRef.current.clear();
    };
  }, [cardDragEnabled, visibleCollections, collapsedCollectionIds, showUndo, refresh]);

  // --- Actions ---
  const moveCardsWithUndo = async (cards, targetParentId, undoLabel) => {
    if (!cards.length) return;
    const snapshots = cards.map((c) => ({ id: c.id, title: c.title, parentId: c.parentId, index: c.index }));

    const targetCollection = collections.find((c) => c.id === targetParentId);
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

    const snapshots = cards.map((c) => ({ id: c.id, title: c.title, parentId: c.parentId, index: c.index }));

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
  handleSaveTabsRef.current = handleSaveTabs;

  const handleAutoOrganize = async () => {
    if (autoOrganizing || !collections.length) return;
    const rootId = activeSourceId || tabHubRootId;
    if (!rootId) return;

    setAutoOrganizing(true);
    try {
      const trashFolder = trashFolderId ? { id: trashFolderId } : await ensureTrashFolder(rootId);
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

      const snapshotById = new Map(cardsBefore.map((c) => [c.id, c]));
      const duplicateIdSet = new Set(duplicates.map((c) => c.id));
      const keptCards = cardsBefore.filter((c) => !duplicateIdSet.has(c.id));
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
        showUndo(t('autoOrganizeResult', duplicates.length, sortedMoves), async () => {
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
  handleAutoOrganizeRef.current = handleAutoOrganize;

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
    const shouldDelete = window.confirm(t('confirmDeleteBookmark', card.title));
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

    const nextTitle = window.prompt(t('renamePrompt'), current.folderTitle || current.title);
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

    const shouldDelete = window.confirm(t('confirmDeleteFolder', current.title));
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
    const targetCollection = collections.find((c) => c.id === editorState.targetParentId);
    const nextTitle = editorState.title.trim();
    const nextUrl = editorState.url.trim();
    if (!nextTitle || !nextUrl || !before) return;

    setEditorState((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      await updateBookmark(editorState.cardId, { title: nextTitle, url: nextUrl });

      if (editorState.targetParentId !== editorState.currentParentId && targetCollection) {
        await moveBookmark(editorState.cardId, editorState.targetParentId, targetCollection.cards.length);
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

  const closeBatchMove = () => setBatchMoveState(null);

  const handleBatchMoveSave = async () => {
    if (!batchMoveState || batchMoveState.moving || !selectedCards.length) return;
    if (!batchMoveState.targetParentId) return;

    setBatchMoveState((prev) => (prev ? { ...prev, moving: true } : prev));
    try {
      await moveCardsWithUndo(
        selectedCards,
        batchMoveState.targetParentId,
        t('movedBookmarks', selectedCards.length)
      );
      clearSelections();
      setBatchMoveState(null);
    } finally {
      setBatchMoveState((prev) => (prev ? { ...prev, moving: false } : prev));
    }
  };

  const handleBatchTrash = async () => {
    if (!selectedCards.length) return;
    const shouldDelete = window.confirm(t('confirmBatchTrash', selectedCards.length));
    if (!shouldDelete) return;
    await moveCardsToTrash(selectedCards);
    clearSelections();
  };

  if (!langReady) return null;

  return (
    <div className="app-shell">
      <div className="layout-root">
        <Sidebar
          sources={sources}
          activeSourceId={activeSourceId}
          collections={collections}
          activeCollectionId={activeCollectionId}
          canSortCollections={canSortCollections}
          themeMode={themeMode}
          languageSetting={languageSetting}
          onSourceChange={handleSourceChange}
          onThemeChange={handleThemeModeChange}
          onLanguageChange={handleLanguageChange}
          onCollectionSelect={setActiveCollectionId}
          onCollectionContextMenu={openCollectionContextMenu}
        />

        <main className="content-area">
          <Toolbar
            activeSource={activeSource}
            manageMode={manageMode}
            autoOrganizing={autoOrganizing}
            search={search}
            searchInputRef={searchInputRef}
            selectedCards={selectedCards}
            onSaveTabs={handleSaveTabs}
            onToggleManageMode={() => setManageMode((prev) => !prev)}
            onAutoOrganize={handleAutoOrganize}
            onSearchChange={setSearch}
            onBatchMove={openBatchMove}
            onBatchTrash={handleBatchTrash}
            onClearSelections={clearSelections}
            canSave={!!(activeSourceId || tabHubRootId)}
          />

          {loading ? (
            <div className="muted">{t('loading')}</div>
          ) : error ? (
            <div className="error-panel">{error}</div>
          ) : visibleCollections.length === 0 ? (
            <div className="empty-panel">{t('noBookmarks')}</div>
          ) : (
            <section className="space-y-5" data-module-sortable="true">
              {visibleCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  collapsed={collapsedCollectionIds.has(collection.id)}
                  moduleDraggable={canSortCollections && collection.editable && collection.parentId === activeSourceId}
                  selectedCardIds={selectedCardIds}
                  manageMode={manageMode}
                  cardDragEnabled={cardDragEnabled}
                  onToggleCollapse={toggleCollection}
                  onCardClick={handleCardClick}
                  onCardContextMenu={openCardContextMenu}
                  onToggleCardSelect={toggleCardSelection}
                  onEditCard={openEditorByCard}
                  onDeleteCard={handleDeleteCardByCard}
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
        collections={collections}
        onSave={handleEditorSave}
        onClose={handleEditorClose}
      />

      <BatchMoveModal
        batchMoveState={batchMoveState}
        setBatchMoveState={setBatchMoveState}
        selectedCards={selectedCards}
        collections={collections}
        onSave={handleBatchMoveSave}
        onClose={closeBatchMove}
      />

      <UndoToast toast={undoToast} onUndo={handleUndo} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
