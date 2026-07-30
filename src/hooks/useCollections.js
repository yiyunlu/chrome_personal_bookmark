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

  // --- Initialization & bookmark change subscription ---
  useEffect(() => {
    (async () => {
      const savedSource = await storageGet('tabhub_active_source').catch(() => undefined);
      await refresh(savedSource || undefined);
      initialLoadDoneRef.current = true;
    })();

    const unsubscribe = subscribeBookmarksChanges(() => {
      refresh(activeSourceRef.current);
    });
    return () => unsubscribe();
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
