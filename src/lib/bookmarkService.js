import { t } from './i18n';
import { logError } from './utils';

const TABHUB_ROOT_NAME = 'TabHub';
const TRASH_FOLDER_NAME = '.TabHub Trash';

function chromeApi(obj, method) {
  return (...args) =>
    new Promise((resolve, reject) => {
      // Resolved at call time, not module scope: keeps the test mocks' _impl
      // dispatch working, and lets `npm run dev` in a plain browser tab load the
      // UI with a clear error instead of crashing on an undefined chrome.*.
      if (!obj || typeof obj[method] !== 'function') {
        reject(new Error(`chrome.${method} 不可用 — 请将 TabHub 作为 Chrome 扩展加载`));
        return;
      }
      obj[method](...args, (result) => {
        const err = chrome.runtime?.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(result);
      });
    });
}

const getTree = chromeApi(globalThis.chrome?.bookmarks, 'getTree');
const createBookmark = chromeApi(globalThis.chrome?.bookmarks, 'create');
const moveBookmarkApi = chromeApi(globalThis.chrome?.bookmarks, 'move');
const updateBookmarkApi = chromeApi(globalThis.chrome?.bookmarks, 'update');
const removeTreeApi = chromeApi(globalThis.chrome?.bookmarks, 'removeTree');
const updateTabApi = chromeApi(globalThis.chrome?.tabs, 'update');
const queryTabsApi = chromeApi(globalThis.chrome?.tabs, 'query');
const createTabApi = chromeApi(globalThis.chrome?.tabs, 'create');
const getSubTreeApi = chromeApi(globalThis.chrome?.bookmarks, 'getSubTree');
const getChildrenApi = chromeApi(globalThis.chrome?.bookmarks, 'getChildren');

function normalizeCollection(folder, titlePrefix = '') {
  const title = folder.title || 'Untitled Collection';
  return {
    id: folder.id,
    parentId: folder.parentId,
    index: folder.index,
    folderTitle: title,
    title: titlePrefix ? `${titlePrefix} / ${title}` : title,
    editable: true,
    deletable: true,
    cards: (folder.children || [])
      .filter((node) => !!node.url)
      .map((bookmark) => ({
        id: bookmark.id,
        title: bookmark.title || bookmark.url,
        url: bookmark.url,
        parentId: bookmark.parentId,
        index: bookmark.index
      }))
  };
}

function collectNestedCollections(rootFolder, includeEmpty = true, hiddenFolderIds = new Set()) {
  const result = [];

  const walk = (folder, prefix = '') => {
    if (hiddenFolderIds.has(folder.id)) {
      return;
    }
    const collection = normalizeCollection(folder, prefix);
    if (includeEmpty || collection.cards.length > 0) {
      result.push(collection);
    }

    const nextPrefix = prefix ? `${prefix} / ${folder.title || 'Untitled'}` : folder.title || 'Untitled';
    (folder.children || []).filter((node) => !node.url).forEach((childFolder) => walk(childFolder, nextPrefix));
  };

  (rootFolder.children || [])
    .filter((node) => !node.url)
    .filter((folder) => !hiddenFolderIds.has(folder.id))
    .forEach((folder) => walk(folder, ''));

  const rootCards = (rootFolder.children || []).filter((node) => !!node.url);
  if (includeEmpty || rootCards.length > 0) {
    result.unshift({
      id: rootFolder.id,
      parentId: rootFolder.id,
      index: -1,
      // Was `${rootFolder.title} / Unfiled` — a hardcoded English word glued onto
      // a translated source name, and a repeat of what the sidebar's source
      // control already shows above it.
      folderTitle: t('unfiled'),
      title: t('unfiled'),
      editable: false,
      deletable: false,
      cards: rootCards.map((bookmark) => ({
        id: bookmark.id,
        title: bookmark.title || bookmark.url,
        url: bookmark.url,
        parentId: bookmark.parentId,
        index: bookmark.index
      }))
    });
  }

  return result;
}

function collectAllFolders(nodes = [], acc = []) {
  for (const node of nodes) {
    if (!node.url) {
      acc.push(node);
      collectAllFolders(node.children || [], acc);
    }
  }
  return acc;
}

function findNodeById(nodes = [], id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export async function ensureTabHubRootFolder() {
  const tree = await getTree();
  const allFolders = collectAllFolders(tree, []);

  const existing = allFolders.find((folder) => folder.title?.trim().toLowerCase() === TABHUB_ROOT_NAME.toLowerCase());
  if (existing) {
    return existing;
  }

  const bookmarksBar = tree[0]?.children?.find((node) => node.id === '1') || tree[0]?.children?.[0];
  const parentId = bookmarksBar?.id || '1';

  return createBookmark({
    parentId,
    title: TABHUB_ROOT_NAME
  });
}

export async function getCollectionsPayload(preferredSourceId) {
  let tree = await getTree();
  let tabHubRoot = collectAllFolders(tree, []).find(
    (folder) => folder.title?.trim().toLowerCase() === TABHUB_ROOT_NAME.toLowerCase()
  );

  if (!tabHubRoot) {
    tabHubRoot = await ensureTabHubRootFolder();
    tree = await getTree();
  }

  const roots = (tree[0]?.children || []).filter((node) => !node.url);
  const sources = roots.map((node) => ({
    id: node.id,
    title: node.title || 'Untitled Root',
    isTabHub: node.title?.trim().toLowerCase() === TABHUB_ROOT_NAME.toLowerCase()
  }));

  if (!sources.some((source) => source.id === tabHubRoot.id)) {
    sources.unshift({
      id: tabHubRoot.id,
      title: tabHubRoot.title || TABHUB_ROOT_NAME,
      isTabHub: true
    });
  }

  const bookmarksBarSource =
    sources.find((source) => source.id === '1') ||
    sources.find((source) => source.title?.trim().toLowerCase() === 'bookmarks bar') ||
    null;
  const defaultSourceId = bookmarksBarSource?.id || tabHubRoot.id || sources[0]?.id;

  const activeSourceId =
    (preferredSourceId && sources.some((source) => source.id === preferredSourceId)
      ? preferredSourceId
      : defaultSourceId) || sources[0]?.id;

  let activeRoot = null;
  try {
    [activeRoot] = await getSubTreeApi(activeSourceId);
  } catch {
    // The source folder can vanish between getTree and getSubTree (deleted in
    // another window / by sync); degrade to the already-fetched tree snapshot.
  }
  const rootNode = activeRoot || findNodeById(tree, activeSourceId) || { children: [] };
  const trashFolder = (rootNode.children || []).find((node) => !node.url && node.title === TRASH_FOLDER_NAME);
  const hiddenFolderIds = new Set(trashFolder ? [trashFolder.id] : []);
  const collections = collectNestedCollections(rootNode, true, hiddenFolderIds);

  return {
    tabHubRootId: tabHubRoot.id,
    sources,
    activeSourceId,
    trashFolderId: trashFolder?.id || '',
    collections
  };
}

/**
 * Fetch all bookmark cards for a given source (folder) ID.
 * Returns a flat array of cards with collectionTitle attached.
 */
export async function getCardsForSource(sourceId) {
  try {
    const [sourceRoot] = await getSubTreeApi(sourceId);
    if (!sourceRoot) return [];
    const trashFolder = (sourceRoot.children || []).find((node) => !node.url && node.title === TRASH_FOLDER_NAME);
    const hiddenFolderIds = new Set(trashFolder ? [trashFolder.id] : []);
    const collections = collectNestedCollections(sourceRoot, false, hiddenFolderIds);
    return collections.flatMap((col) =>
      col.cards.map((card) => ({
        ...card,
        collectionId: col.id,
        collectionTitle: col.title
      }))
    );
  } catch {
    return [];
  }
}

export function subscribeBookmarksChanges(onChange) {
  if (!globalThis.chrome?.bookmarks?.onCreated) {
    return () => {};
  }
  const handler = () => onChange();
  chrome.bookmarks.onCreated.addListener(handler);
  chrome.bookmarks.onRemoved.addListener(handler);
  chrome.bookmarks.onChanged.addListener(handler);
  chrome.bookmarks.onMoved.addListener(handler);
  chrome.bookmarks.onChildrenReordered.addListener(handler);

  return () => {
    chrome.bookmarks.onCreated.removeListener(handler);
    chrome.bookmarks.onRemoved.removeListener(handler);
    chrome.bookmarks.onChanged.removeListener(handler);
    chrome.bookmarks.onMoved.removeListener(handler);
    chrome.bookmarks.onChildrenReordered.removeListener(handler);
  };
}

export async function getOpenTabs() {
  const tabs = await queryTabsApi({ currentWindow: true });
  return tabs
    .filter((tab) => tab.url && /^https?:/i.test(tab.url))
    .map((tab) => ({
      id: tab.id,
      title: tab.title || tab.url,
      url: tab.url,
      favIconUrl: tab.favIconUrl
    }));
}

// Local wall-clock timestamp — toISOString() would label the folder in UTC,
// so an evening save could show tomorrow's date.
function defaultSaveFolderName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

export async function saveCurrentWindowTabsToCollection(rootId, { tabs, folderName } = {}) {
  const savableTabs =
    tabs ||
    (await queryTabsApi({ currentWindow: true })).filter((tab) => tab.url && /^https?:/i.test(tab.url));
  const name = folderName || defaultSaveFolderName();
  const folder = await createBookmark({
    parentId: rootId,
    title: name
  });

  await Promise.all(
    savableTabs.map((tab) =>
      createBookmark({
        parentId: folder.id,
        title: tab.title || tab.url,
        url: tab.url
      })
    )
  );

  return folder;
}

export async function moveBookmark(bookmarkId, parentId, index) {
  return moveBookmarkApi(bookmarkId, { parentId, index });
}

// chrome.bookmarks indexes count every child of a folder — subfolders included —
// while the UI only renders URL bookmarks (cards). Translates a card-relative
// position (e.g. a SortableJS drop index) into the folder's real child index by
// inserting before the card currently at that position; chrome.bookmarks.move
// interprets the index against the pre-move child list, so passing that card's
// absolute index is correct for cross-folder and both same-folder directions.
// A null/past-the-end position appends to the folder. Children are fetched at
// call time, so this is also safe inside deferred undo callbacks.
export async function moveBookmarkToCardPosition(bookmarkId, parentId, cardPosition) {
  const children = await getChildrenApi(parentId);
  const cards = children.filter((node) => !!node.url && node.id !== bookmarkId);
  const nextCard = cardPosition == null ? undefined : cards[cardPosition];
  return moveBookmarkApi(bookmarkId, {
    parentId,
    ...(nextCard ? { index: nextCard.index } : {})
  });
}

export async function updateBookmark(bookmarkId, changes) {
  return updateBookmarkApi(bookmarkId, changes);
}

export async function createCollectionFolder(parentId, title) {
  return createBookmark({ parentId, title });
}

export async function addBookmarkToFolder(parentId, title, url) {
  return createBookmark({ parentId, title, url });
}

export async function getTrashContents(rootId) {
  const [root] = await getSubTreeApi(rootId);
  const trashFolder = (root?.children || []).find((node) => !node.url && node.title === TRASH_FOLDER_NAME);
  if (!trashFolder) return { trashId: null, items: [] };
  const items = (trashFolder.children || [])
    .filter((node) => !!node.url)
    .map((b) => ({ id: b.id, title: b.title || b.url, url: b.url, parentId: b.parentId, index: b.index }));
  return { trashId: trashFolder.id, items };
}

export async function renameCollectionFolder(collectionId, title) {
  return updateBookmarkApi(collectionId, { title });
}

export async function removeCollectionFolder(collectionId) {
  return removeTreeApi(collectionId);
}

export async function ensureTrashFolder(rootId) {
  const [root] = await getSubTreeApi(rootId);
  const existing = (root?.children || []).find((node) => !node.url && node.title === TRASH_FOLDER_NAME);
  if (existing) {
    return existing;
  }
  return createBookmark({
    parentId: rootId,
    title: TRASH_FOLDER_NAME
  });
}

export async function openBookmarkInCurrentTab(url) {
  return updateTabApi(undefined, { url });
}

export async function openBookmarkInNewTab(url) {
  return createTabApi({ url, active: false });
}

export async function openAllInNewTabs(urls) {
  return Promise.all(urls.map((url) => createTabApi({ url, active: false })));
}

export function exportCollections(collections) {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections: collections.map((c) => ({
      title: c.folderTitle || c.title,
      cards: c.cards.map((card) => ({
        title: card.title,
        url: card.url
      }))
    }))
  };
  return JSON.stringify(data, null, 2);
}

export async function importCollections(jsonString, parentId) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (err) {
    logError('bookmarkService.importCollections', err);
    throw new Error('Invalid JSON');
  }

  if (!data || !Array.isArray(data.collections)) {
    throw new Error('Invalid import file format');
  }

  let collectionsCreated = 0;
  let bookmarksCreated = 0;

  for (const col of data.collections) {
    const folder = await createBookmark({
      parentId,
      title: col.title || 'Untitled'
    });
    collectionsCreated += 1;

    const cards = Array.isArray(col.cards) ? col.cards : [];
    for (const card of cards) {
      if (card.url) {
        await createBookmark({
          parentId: folder.id,
          title: card.title || card.url,
          url: card.url
        });
        bookmarksCreated += 1;
      }
    }
  }

  return { collectionsCreated, bookmarksCreated };
}
