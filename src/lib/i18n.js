const LANG_STORAGE_KEY = 'tabhub_language';

const dictionaries = {
  'zh-CN': {
    appTitle: 'TabHub',
    appSubtitle: '我的收藏',
    bookmarkSource: '书签源',
    theme: '主题',
    themeSystem: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',
    language: '语言',
    langAuto: '跟随浏览器',
    langZh: '中文',
    langEn: 'English',
    allCollections: '全部收藏',
    rightClickHint: '右键可编辑目录',
    systemFolder: '系统目录，禁止编辑',
    saveTabsTo: '保存当前所有标签页到',
    currentSource: '当前书签源',
    enterManageMode: '进入管理模式',
    exitManageMode: '退出管理模式',
    autoOrganize: '自动整理',
    autoOrganizing: '自动整理中...',
    searchPlaceholder: '搜索书签标题或 URL',
    efficiencyEntry: '效率入口:',
    shortcutSearch: '/ 搜索',
    shortcutSave: 'S 保存当前标签',
    shortcutOrganize: 'O 自动整理',
    shortcutManage: 'M 管理模式',
    selectedCount: (n) => `已选 ${n} 项`,
    batchMove: '批量移动',
    moveToTrash: '删除到回收站',
    clearSelection: '清空选择',
    loading: '加载中...',
    noBookmarks: '暂无可显示书签。',
    items: '项',
    editBookmarkWithFolder: '编辑书签（含目录）',
    deleteToTrash: '删除到回收站',
    renameFolder: '重命名目录',
    deleteFolder: '删除目录',
    editBookmark: '编辑书签',
    titleLabel: '标题',
    urlLabel: 'URL',
    moveToFolder: '移动到文件夹',
    searchFolder: '搜索文件夹...',
    cancel: '取消',
    save: '保存',
    saving: '保存中...',
    batchMoveTitle: (n) => `批量移动书签（${n} 项）`,
    searchTargetFolder: '搜索目标文件夹',
    moving: '移动中...',
    undo: '撤销',
    undoing: '撤销中...',
    edit: '编辑',
    delete: '删除',
    movedBookmarks: (n) => `已移动 ${n} 个书签`,
    movedToTrash: (n) => `已移入回收站 ${n} 项`,
    bookmarkUpdated: '书签已更新',
    autoOrganizeResult: (dup, sort) => `自动整理完成：去重 ${dup}，重排 ${sort}`,
    confirmDeleteBookmark: (title) => `删除书签：${title} ?`,
    confirmDeleteFolder: (title) => `删除目录"${title}"及其全部书签？`,
    confirmBatchTrash: (n) => `将 ${n} 个书签移入回收站？`,
    renamePrompt: '重命名目录'
  },
  en: {
    appTitle: 'TabHub',
    appSubtitle: 'My Collections',
    bookmarkSource: 'Source',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    langAuto: 'Auto (Browser)',
    langZh: '中文',
    langEn: 'English',
    allCollections: 'All Collections',
    rightClickHint: 'Right-click to edit',
    systemFolder: 'System folder, not editable',
    saveTabsTo: 'Save all tabs to',
    currentSource: 'current source',
    enterManageMode: 'Manage',
    exitManageMode: 'Exit Manage',
    autoOrganize: 'Auto Organize',
    autoOrganizing: 'Organizing...',
    searchPlaceholder: 'Search bookmarks by title or URL',
    efficiencyEntry: 'Quick Actions:',
    shortcutSearch: '/ Search',
    shortcutSave: 'S Save Tabs',
    shortcutOrganize: 'O Organize',
    shortcutManage: 'M Manage',
    selectedCount: (n) => `${n} selected`,
    batchMove: 'Batch Move',
    moveToTrash: 'Move to Trash',
    clearSelection: 'Clear',
    loading: 'Loading...',
    noBookmarks: 'No bookmarks to display.',
    items: 'items',
    editBookmarkWithFolder: 'Edit Bookmark (with folder)',
    deleteToTrash: 'Move to Trash',
    renameFolder: 'Rename Folder',
    deleteFolder: 'Delete Folder',
    editBookmark: 'Edit Bookmark',
    titleLabel: 'Title',
    urlLabel: 'URL',
    moveToFolder: 'Move to Folder',
    searchFolder: 'Search folders...',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    batchMoveTitle: (n) => `Batch Move Bookmarks (${n})`,
    searchTargetFolder: 'Search target folder',
    moving: 'Moving...',
    undo: 'Undo',
    undoing: 'Undoing...',
    edit: 'Edit',
    delete: 'Delete',
    movedBookmarks: (n) => `Moved ${n} bookmark(s)`,
    movedToTrash: (n) => `Moved ${n} item(s) to trash`,
    bookmarkUpdated: 'Bookmark updated',
    autoOrganizeResult: (dup, sort) => `Organized: ${dup} duplicates removed, ${sort} re-sorted`,
    confirmDeleteBookmark: (title) => `Delete bookmark: ${title}?`,
    confirmDeleteFolder: (title) => `Delete folder "${title}" and all bookmarks?`,
    confirmBatchTrash: (n) => `Move ${n} bookmark(s) to trash?`,
    renamePrompt: 'Rename folder'
  }
};

let currentLang = 'zh-CN';

function resolveLanguage(setting) {
  if (setting === 'zh-CN' || setting === 'en') return setting;
  // auto-detect from browser
  const browserLang = (navigator.language || 'en').toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh-CN';
  return 'en';
}

export function initLanguage() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get([LANG_STORAGE_KEY], (result) => {
        const saved = result?.[LANG_STORAGE_KEY];
        currentLang = resolveLanguage(saved || 'auto');
        resolve(currentLang);
      });
    } else {
      currentLang = resolveLanguage('auto');
      resolve(currentLang);
    }
  });
}

export function getLanguageSetting() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get([LANG_STORAGE_KEY], (result) => {
        resolve(result?.[LANG_STORAGE_KEY] || 'auto');
      });
    } else {
      resolve('auto');
    }
  });
}

export function setLanguage(lang) {
  const resolved = resolveLanguage(lang);
  currentLang = resolved;
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [LANG_STORAGE_KEY]: lang }, () => resolve());
    } else {
      resolve();
    }
  });
}

export function t(key, ...args) {
  const dict = dictionaries[currentLang] || dictionaries['en'];
  const val = dict[key];
  if (typeof val === 'function') return val(...args);
  return val || key;
}

export function getCurrentLang() {
  return currentLang;
}
