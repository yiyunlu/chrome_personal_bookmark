const TABHUB_ROOT_NAME = 'TabHub';

function promisifyChromeApi(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (result) => {
        const err = chrome.runtime?.lastError;
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve(result);
      });
    });
}

const getTree = promisifyChromeApi(chrome.bookmarks.getTree.bind(chrome.bookmarks));
const createBookmark = promisifyChromeApi(chrome.bookmarks.create.bind(chrome.bookmarks));
const moveBookmarkApi = promisifyChromeApi(chrome.bookmarks.move.bind(chrome.bookmarks));
const updateBookmarkApi = promisifyChromeApi(chrome.bookmarks.update.bind(chrome.bookmarks));
const removeBookmarkApi = promisifyChromeApi(chrome.bookmarks.remove.bind(chrome.bookmarks));
const removeTreeApi = promisifyChromeApi(chrome.bookmarks.removeTree.bind(chrome.bookmarks));
const updateTabApi = promisifyChromeApi(chrome.tabs.update.bind(chrome.tabs));
const queryTabsApi = promisifyChromeApi(chrome.tabs.query.bind(chrome.tabs));
const getSubTreeApi = promisifyChromeApi(chrome.bookmarks.getSubTree.bind(chrome.bookmarks));

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

function collectNestedCollections(rootFolder, includeEmpty = true) {
  const result = [];

  const walk = (folder, prefix = '') => {
    const collection = normalizeCollection(folder, prefix);
    if (includeEmpty || collection.cards.length > 0) {
      result.push(collection);
    }

    const nextPrefix = prefix ? `${prefix} / ${folder.title || 'Untitled'}` : folder.title || 'Untitled';
    (folder.children || [])
      .filter((node) => !node.url)
      .forEach((childFolder) => walk(childFolder, nextPrefix));
  };

  (rootFolder.children || [])
    .filter((node) => !node.url)
    .forEach((folder) => walk(folder, ''));

  const rootCards = (rootFolder.children || []).filter((node) => !!node.url);
  if (includeEmpty || rootCards.length > 0) {
    result.unshift({
      id: rootFolder.id,
      parentId: rootFolder.id,
      index: -1,
      folderTitle: rootFolder.title || 'Unfiled',
      title: rootFolder.title ? `${rootFolder.title} / Unfiled` : 'Unfiled',
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

  const existing = allFolders.find(
    (folder) => folder.title?.trim().toLowerCase() === TABHUB_ROOT_NAME.toLowerCase()
  );
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
  const tree = await getTree();
  let tabHubRoot = collectAllFolders(tree, []).find(
    (folder) => folder.title?.trim().toLowerCase() === TABHUB_ROOT_NAME.toLowerCase()
  );

  if (!tabHubRoot) {
    tabHubRoot = await ensureTabHubRootFolder();
  }

  const refreshedTree = await getTree();
  const roots = (refreshedTree[0]?.children || []).filter((node) => !node.url);
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
      : defaultSourceId) ||
    sources[0]?.id;

  const [activeRoot] = await getSubTreeApi(activeSourceId);
  const fallbackRoot = findNodeById(refreshedTree, activeSourceId);
  const collections = collectNestedCollections(activeRoot || fallbackRoot || { children: [] }, true);

  return {
    tabHubRootId: tabHubRoot.id,
    sources,
    activeSourceId,
    collections
  };
}

export function subscribeBookmarksChanges(onChange) {
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

export async function saveCurrentWindowTabsToCollection(rootId) {
  const tabs = await queryTabsApi({ currentWindow: true });
  const now = new Date();
  const folderName = now.toISOString().slice(0, 19).replace('T', ' ');
  const folder = await createBookmark({
    parentId: rootId,
    title: folderName
  });

  const savableTabs = tabs.filter((tab) => tab.url && /^https?:/i.test(tab.url));
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

export async function updateBookmark(bookmarkId, changes) {
  return updateBookmarkApi(bookmarkId, changes);
}

export async function removeBookmark(bookmarkId) {
  return removeBookmarkApi(bookmarkId);
}

export async function renameCollectionFolder(collectionId, title) {
  return updateBookmarkApi(collectionId, { title });
}

export async function removeCollectionFolder(collectionId) {
  return removeTreeApi(collectionId);
}

export async function openBookmarkInCurrentTab(url) {
  return updateTabApi(undefined, { url });
}
