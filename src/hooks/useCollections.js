import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCollectionsPayload, subscribeBookmarksChanges } from '../lib/bookmarkService';
import { storageGet, storageSet } from '../lib/storage';
import { logError } from '../lib/utils';

export function useCollections() {
  const [tabHubRootId, setTabHubRootId] = useState('');
  const [sources, setSources] = useState([]);
  const [activeSourceId, setActiveSourceId] = useState('');
  const [trashFolderId, setTrashFolderId] = useState('');
  const activeSourceRef = useRef('');

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const initialLoadDoneRef = useRef(false);

  // --- Data refresh ---
  const refreshSeqRef = useRef(0);
  const refresh = useCallback(async (preferredSourceId = activeSourceRef.current) => {
    // Concurrent refreshes can resolve out of order (e.g. a slow fetch landing
    // after a source switch); only the most recent one may write state.
    const seq = ++refreshSeqRef.current;
    try {
      const result = await getCollectionsPayload(preferredSourceId);
      if (seq !== refreshSeqRef.current) return;
      setTabHubRootId(result.tabHubRootId);
      setSources(result.sources);
      setActiveSourceId(result.activeSourceId);
      setTrashFolderId(result.trashFolderId || '');
      activeSourceRef.current = result.activeSourceId;
      setCollections(result.collections);
      setError('');
    } catch (e) {
      if (seq !== refreshSeqRef.current) return;
      setError(e?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Initialization & bookmark change subscription ---
  useEffect(() => {
    (async () => {
      const savedSource = await storageGet('tabhub_active_source').catch(() => undefined);
      await refresh(savedSource || undefined);
      initialLoadDoneRef.current = true;
    })();

    // Bulk operations (save tabs, batch move, undo) fire one bookmark event per
    // node — coalesce the storm into a single refetch.
    let syncDebounceTimer = null;
    const unsubscribe = subscribeBookmarksChanges(() => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        syncDebounceTimer = null;
        refresh(activeSourceRef.current);
      }, 150);
    });
    return () => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      unsubscribe();
    };
  }, [refresh]);

  // --- Persist activeSourceId to storage ---
  useEffect(() => {
    if (initialLoadDoneRef.current && activeSourceId) {
      storageSet('tabhub_active_source', activeSourceId).catch(logError);
    }
  }, [activeSourceId]);

  // --- Computed values ---
  const activeSource = sources.find((source) => source.id === activeSourceId) || null;

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
  const cardByIdRef = useRef(cardById);
  cardByIdRef.current = cardById;

  return {
    tabHubRootId,
    sources,
    activeSourceId,
    setActiveSourceId,
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
  };
}
