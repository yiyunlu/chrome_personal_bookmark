import { logError } from './utils';

const TABHUB_ROOT_NAME = 'TabHub';
const TRASH_FOLDER_NAME = '.TabHub Trash';

function chromeApi(obj, method) {
  return (...args) =>
    new Promise((resolve, reject) => {
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

const getTree = chromeApi(chrome.bookmarks, 'getTree');
const createBookmark = chromeApi(chrome.bookmarks, 'create');
const moveBookmarkApi = chromeApi(chrome.bookmarks, 'move');
const updateBookmarkApi = chromeApi(chrome.bookmarks, 'update');
const removeTreeApi = chromeApi(chrome.bookmarks, 'removeTree');
const updateTabApi = chromeApi(chrome.tabs, 'update');
const queryTabsApi = chromeApi(chrome.tabs, 'query');
const createTabApi = chromeApi(chrome.tabs, 'create');
const getSubTreeApi = chromeApi(chrome.bookmarks, 'getSubTree');

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

  const [activeRoot] = await getSubTreeApi(activeSourceId);
  const fallbackRoot = findNodeById(tree, activeSourceId);
  const rootNode = activeRoot || fallbackRoot || { children: [] };
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

export async function saveCurrentWindowTabsToCollection(rootId, { tabs, folderName } = {}) {
  const savableTabs =
    tabs ||
    (await queryTabsApi({ currentWindow: true })).filter((tab) => tab.url && /^https?:/i.test(tab.url));
  const name = folderName || new Date().toISOString().slice(0, 19).replace('T', ' ');
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
