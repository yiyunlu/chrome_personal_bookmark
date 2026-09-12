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
    navCategories: '分类',
    rightClickHint: '右键可编辑目录',
    systemFolder: '系统目录，禁止编辑',
    saveTabsTo: '保存当前所有标签页到',
    saveTabs: '保存标签页',
    currentSource: '当前书签源',
    current: '当前',
    enterManageMode: '管理模式',
    exitManageMode: '退出管理',
    autoOrganize: '自动整理',
    autoOrganizing: '整理中…',
    searchPlaceholder: '搜索书签标题或 URL…',
    efficiencyEntry: '效率入口:',
    shortcutSearch: '/ 搜索',
    shortcutSave: 'S 保存当前标签',
    shortcutOrganize: 'O 自动整理',
    shortcutManage: 'M 管理模式',
    selectedCount: (n) => `已选 ${n} 项`,
    batchMove: '批量移动',
    moveToTrash: '删除到回收站',
    clearSelection: '清空',
    loading: '加载中...',
    noBookmarks: '暂无可显示书签',
    noBookmarksHint: '点击「保存标签页」将当前打开的网页保存到此处',
    items: '项',
    editBookmarkWithFolder: '编辑书签（含目录）',
    editBookmark: '编辑书签',
    deleteToTrash: '删除到回收站',
    renameFolder: '重命名目录',
    deleteFolder: '删除目录',
    bookmarkActions: '书签操作',
    collectionActions: '目录操作',
    titleLabel: '标题',
    urlLabel: 'URL',
    moveToFolder: '移动到文件夹',
    searchFolder: '搜索文件夹…',
    selectTargetFolder: '选择目标文件夹',
    cancel: '取消',
    save: '保存',
    saving: '保存中…',
    batchMoveTitle: (n) => `批量移动书签（${n} 项）`,
    searchTargetFolder: '搜索目标文件夹',
    moving: '移动中…',
    undo: '撤销',
    undoing: '撤销中…',
    edit: '编辑',
    delete: '删除',
    close: '关闭',
    movedBookmarks: (n) => `已移动 ${n} 个书签`,
    movedToTrash: (n) => `已移入回收站 ${n} 项`,
    bookmarkUpdated: '书签已更新',
    autoOrganizeResult: (dup, sort) => `自动整理完成：去重 ${dup}，重排 ${sort}`,
    confirmDeleteBookmark: (title) => `删除书签：${title} ?`,
    confirmDeleteFolder: (title) => `删除目录"${title}"及其全部书签？`,
    confirmBatchTrash: (n) => `将 ${n} 个书签移入回收站？`,
    renamePrompt: '重命名目录',
    dragHere: '拖拽书签到此处',
    expandSidebar: '展开侧栏',
    collapseSidebar: '收起侧栏',
    // AI Categorize
    aiCategorize: 'AI 分类',
    aiCategorizeTitle: 'AI 智能分类',
    aiAnalyzing: '正在分析书签…',
    aiNoSuggestions: '所有书签已在合适的分类中，无需调整。',
    aiSuggestNewCollections: '建议新建分类：',
    aiAccept: '接受',
    aiReject: '拒绝',
    aiAccepted: '已接受',
    aiRejected: '已忽略',
    aiSummary: (accepted, pending) => `${accepted} 项已接受，${pending} 项待确认`,
    aiApply: (n) => `应用 ${n} 项`,
    aiCategorizeFailed: 'AI 分类失败',
    aiCategorizeComplete: (n) => `AI 分类完成：移动了 ${n} 个书签`,
    // Dead Link
    deadLinkCheck: '失效检测',
    deadLinkTitle: '失效链接检测',
    deadLinkChecking: '正在检测链接…',
    deadLinkProgress: (checked, total) => `${checked}/${total}`,
    deadLinkAllGood: '所有链接均有效',
    deadLinkAllGoodDetail: (count) => `已检测 ${count} 个书签，未发现失效链接`,
    deadLinkFound: (dead, total) => `发现 ${dead} 个失效链接（共检测 ${total} 个）`,
    deadLinkDeleteTitle: '删除此书签',
    deadLinkCheckFailed: '检测失败',
    deadLinkConfirmed: '确认无效',
    deadLinkUnknown: '无法验证',
    // Chat
    chatTitle: 'AI 助手',
    chatHint: '试试输入：',
    chatExample1: '「搜索 React」',
    chatExample2: '「查找重复」',
    chatExample3: '「统计」',
    chatExample4: '「移动 GitHub 到 Development」',
    chatConfirm: '确认执行',
    chatPlaceholder: '输入指令或问题…',
    chatDeletedBookmarks: (n) => `已删除 ${n} 个书签。`,
    chatMovedBookmarks: (n, target) => `已移动 ${n} 个书签到「${target}」。`,
    chatEnterSearchQuery: '请输入搜索关键词。',
    chatNoResults: (query) => `未找到与「${query}」匹配的书签。`,
    chatFoundBookmarks: (n) => `找到 ${n} 个匹配的书签：`,
    chatSpecifyMoveTarget: '请指定要移动的书签和目标分类。',
    chatCollectionNotFound: (name) => `未找到名为「${name}」的分类。`,
    chatWillMove: (n, target) => `将移动 ${n} 个书签到「${target}」。`,
    chatSpecifyDeleteTarget: '请指定要删除的书签。',
    chatConfirmDelete: (n) => `找到 ${n} 个匹配的书签，确认删除？`,
    chatNoDuplicates: '未发现重复书签。',
    chatFoundDuplicates: (n) => `发现 ${n} 个重复书签：`,
    chatUseToolbar: '请使用工具栏中的「AI 分类」或「自动整理」按钮来整理书签。',
    chatStats: (bookmarks, collections) => `共 ${bookmarks} 个书签，${collections} 个分类。`,
    chatTopCollections: '书签最多的分类：',
    chatCollectionCount: (name, count) => `  ${name}: ${count} 个`,
    chatUnknownCommand: '抱歉，我不太理解这个指令。试试「搜索 React」或「查找重复」。',
    chatUnderstood: '我理解了。',
    // Enrichment
    linkTimeout: '请求超时',
    linkUnreachable: '无法访问',
    // AI mock reasons
    aiReasonDomain: (hostname, category) => `${hostname} 属于${category}`,
    aiReasonTitle: (keyword) => `标题包含「${keyword}」`,
    // Shortcuts
    shortcutSaveKey: '快捷键: S',
    shortcutOrganizeKey: '快捷键: O',
    shortcutManageKey: '快捷键: M',
    shortcutAICategorize: 'AI 智能分类',
    shortcutDeadLink: '检测失效链接',
    // New collection
    newCollection: '新建分类',
    newCollectionPrompt: '分类名称',
    // Trash
    trash: '回收站',
    trashEmpty: '回收站为空',
    restore: '恢复',
    emptyTrash: '清空回收站',
    confirmEmptyTrash: '确认清空回收站？此操作不可撤销。',
    restoredBookmark: '已恢复书签',
    trashEmptied: '回收站已清空',
    // Settings
    settings: '设置',
    apiKeyLabel: 'Claude API Key',
    apiKeyPlaceholder: '输入你的 Claude API Key…',
    showApiKey: '显示 API Key',
    hideApiKey: '隐藏 API Key',
    apiKeySaved: 'API Key 已保存',
    apiKeyCleared: 'API Key 已清除',
    aiModeActive: 'AI 模式',
    aiModeMock: '演示模式',
    testConnection: '测试连接',
    testConnectionSuccess: '连接成功！',
    testConnectionFailed: '连接失败',
    // Import / Export
    dataSection: '数据',
    exportData: '导出数据',
    importData: '导入数据',
    exportSuccess: (n) => `已导出 ${n} 个集合`,
    importSuccess: (n, m) => `已导入 ${n} 个集合，${m} 个书签`,
    importFailed: (msg) => `导入失败：${msg}`,
    invalidImportFile: '无效的导入文件',
    // Open tabs
    openAllTabs: '全部打开',
    openInNewTab: '在新标签页中打开',
    // Save Tabs Preview
    saveTabsTitle: '保存标签页',
    folderName: '文件夹名称',
    selectAll: '全选',
    deselectAll: '取消全选',
    targetCollection: '目标集合',
    newCollectionOption: '新建集合',
    tabsSelected: (n) => `已选 ${n} 个标签页`,
    savedTabs: (n) => `已保存 ${n} 个标签页`,
    // Modal dialogs
    confirm: '确认',
    deleteBookmarkTitle: '删除书签',
    deleteCollectionTitle: '删除集合',
    batchTrashTitle: '批量删除',
    emptyTrashTitle: '清空回收站',
    renameCollectionTitle: '重命名集合',
    newCollectionTitle: '新建分类',
    // Onboarding
    welcomeTitle: '欢迎使用 TabHub',
    welcomeMessage: '开始管理您的书签吧',
    welcomeSaveTabs: '保存当前标签页',
    welcomeCreateCollection: '创建集合',
    welcomeConnectAI: '连接 AI',
    welcomeDismiss: '不再显示',
    // Cross-source search
    otherSourceResults: '其他来源的结果',
    fromSource: (name) => `来自 ${name}`
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
    navCategories: 'Categories',
    rightClickHint: 'Right-click to edit',
    systemFolder: 'System folder, not editable',
    saveTabsTo: 'Save all tabs to',
    saveTabs: 'Save Tabs',
    currentSource: 'current source',
    current: 'Current',
    enterManageMode: 'Manage',
    exitManageMode: 'Exit Manage',
    autoOrganize: 'Auto Organize',
    autoOrganizing: 'Organizing...',
    searchPlaceholder: 'Search bookmarks by title or URL...',
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
    noBookmarksHint: 'Click "Save Tabs" to save your open tabs here',
    items: 'items',
    editBookmarkWithFolder: 'Edit Bookmark (with folder)',
    editBookmark: 'Edit Bookmark',
    deleteToTrash: 'Move to Trash',
    renameFolder: 'Rename Folder',
    deleteFolder: 'Delete Folder',
    bookmarkActions: 'Bookmark actions',
    collectionActions: 'Folder actions',
    titleLabel: 'Title',
    urlLabel: 'URL',
    moveToFolder: 'Move to Folder',
    searchFolder: 'Search folders...',
    selectTargetFolder: 'Select target folder',
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
    close: 'Close',
    movedBookmarks: (n) => `Moved ${n} bookmark(s)`,
    movedToTrash: (n) => `Moved ${n} item(s) to trash`,
    bookmarkUpdated: 'Bookmark updated',
    autoOrganizeResult: (dup, sort) => `Organized: ${dup} duplicates removed, ${sort} re-sorted`,
    confirmDeleteBookmark: (title) => `Delete bookmark: ${title}?`,
    confirmDeleteFolder: (title) => `Delete folder "${title}" and all bookmarks?`,
    confirmBatchTrash: (n) => `Move ${n} bookmark(s) to trash?`,
    renamePrompt: 'Rename folder',
    dragHere: 'Drag bookmarks here',
    expandSidebar: 'Expand sidebar',
    collapseSidebar: 'Collapse sidebar',
    // AI Categorize
    aiCategorize: 'AI Categorize',
    aiCategorizeTitle: 'AI Smart Categorize',
    aiAnalyzing: 'Analyzing bookmarks...',
    aiNoSuggestions: 'All bookmarks are in the right collections. No changes needed.',
    aiSuggestNewCollections: 'Suggested new collections:',
    aiAccept: 'Accept',
    aiReject: 'Reject',
    aiAccepted: 'Accepted',
    aiRejected: 'Rejected',
    aiSummary: (accepted, pending) => `${accepted} accepted, ${pending} pending`,
    aiApply: (n) => `Apply ${n} item(s)`,
    aiCategorizeFailed: 'AI categorization failed',
    aiCategorizeComplete: (n) => `AI categorized: moved ${n} bookmark(s)`,
    // Dead Link
    deadLinkCheck: 'Dead Links',
    deadLinkTitle: 'Dead Link Detection',
    deadLinkChecking: 'Checking links...',
    deadLinkProgress: (checked, total) => `${checked}/${total}`,
    deadLinkAllGood: 'All links are valid',
    deadLinkAllGoodDetail: (count) => `Checked ${count} bookmarks, no dead links found`,
    deadLinkFound: (dead, total) => `Found ${dead} dead link(s) (${total} checked)`,
    deadLinkDeleteTitle: 'Delete this bookmark',
    deadLinkCheckFailed: 'Detection failed',
    deadLinkConfirmed: 'Confirmed dead',
    deadLinkUnknown: 'Could not verify',
    // Chat
    chatTitle: 'AI Assistant',
    chatHint: 'Try typing:',
    chatExample1: '"search React"',
    chatExample2: '"find duplicates"',
    chatExample3: '"stats"',
    chatExample4: '"move GitHub to Development"',
    chatConfirm: 'Confirm',
    chatPlaceholder: 'Type a command or question...',
    chatDeletedBookmarks: (n) => `Deleted ${n} bookmark(s).`,
    chatMovedBookmarks: (n, target) => `Moved ${n} bookmark(s) to "${target}".`,
    chatEnterSearchQuery: 'Please enter a search query.',
    chatNoResults: (query) => `No bookmarks matching "${query}" found.`,
    chatFoundBookmarks: (n) => `Found ${n} matching bookmark(s):`,
    chatSpecifyMoveTarget: 'Please specify the bookmark and target collection.',
    chatCollectionNotFound: (name) => `No collection named "${name}" found.`,
    chatWillMove: (n, target) => `Will move ${n} bookmark(s) to "${target}".`,
    chatSpecifyDeleteTarget: 'Please specify the bookmark to delete.',
    chatConfirmDelete: (n) => `Found ${n} matching bookmark(s). Confirm delete?`,
    chatNoDuplicates: 'No duplicate bookmarks found.',
    chatFoundDuplicates: (n) => `Found ${n} duplicate bookmark(s):`,
    chatUseToolbar: 'Please use the "AI Categorize" or "Auto Organize" buttons in the toolbar.',
    chatStats: (bookmarks, collections) => `${bookmarks} bookmarks in ${collections} collections.`,
    chatTopCollections: 'Top collections:',
    chatCollectionCount: (name, count) => `  ${name}: ${count}`,
    chatUnknownCommand: 'Sorry, I didn\'t understand that command. Try "search React" or "find duplicates".',
    chatUnderstood: 'Got it.',
    // Enrichment
    linkTimeout: 'Request timed out',
    linkUnreachable: 'Unreachable',
    // AI mock reasons
    aiReasonDomain: (hostname, category) => `${hostname} belongs to ${category}`,
    aiReasonTitle: (keyword) => `Title contains "${keyword}"`,
    // Shortcuts
    shortcutSaveKey: 'Shortcut: S',
    shortcutOrganizeKey: 'Shortcut: O',
    shortcutManageKey: 'Shortcut: M',
    shortcutAICategorize: 'AI Smart Categorize',
    shortcutDeadLink: 'Check dead links',
    // New collection
    newCollection: 'New Collection',
    newCollectionPrompt: 'Collection name',
    // Trash
    trash: 'Trash',
    trashEmpty: 'Trash is empty',
    restore: 'Restore',
    emptyTrash: 'Empty Trash',
    confirmEmptyTrash: 'Empty trash? This cannot be undone.',
    restoredBookmark: 'Bookmark restored',
    trashEmptied: 'Trash emptied',
    // Settings
    settings: 'Settings',
    apiKeyLabel: 'Claude API Key',
    apiKeyPlaceholder: 'Enter your Claude API Key...',
    showApiKey: 'Show API Key',
    hideApiKey: 'Hide API Key',
    apiKeySaved: 'API Key saved',
    apiKeyCleared: 'API Key cleared',
    aiModeActive: 'AI Mode',
    aiModeMock: 'Demo Mode',
    testConnection: 'Test Connection',
    testConnectionSuccess: 'Connection successful!',
    testConnectionFailed: 'Connection failed',
    // Import / Export
    dataSection: 'Data',
    exportData: 'Export Data',
    importData: 'Import Data',
    exportSuccess: (n) => `Exported ${n} collections`,
    importSuccess: (n, m) => `Imported ${n} collections, ${m} bookmarks`,
    importFailed: (msg) => `Import failed: ${msg}`,
    invalidImportFile: 'Invalid import file',
    // Open tabs
    openAllTabs: 'Open All',
    openInNewTab: 'Open in New Tab',
    // Save Tabs Preview
    saveTabsTitle: 'Save Tabs',
    folderName: 'Folder Name',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    targetCollection: 'Target Collection',
    newCollectionOption: 'New Collection',
    tabsSelected: (n) => `${n} tabs selected`,
    savedTabs: (n) => `Saved ${n} tabs`,
    // Modal dialogs
    confirm: 'Confirm',
    deleteBookmarkTitle: 'Delete Bookmark',
    deleteCollectionTitle: 'Delete Collection',
    batchTrashTitle: 'Batch Delete',
    emptyTrashTitle: 'Empty Trash',
    renameCollectionTitle: 'Rename Collection',
    newCollectionTitle: 'New Collection',
    // Onboarding
    welcomeTitle: 'Welcome to TabHub',
    welcomeMessage: 'Start managing your bookmarks',
    welcomeSaveTabs: 'Save Current Tabs',
    welcomeCreateCollection: 'Create a Collection',
    welcomeConnectAI: 'Connect AI',
    welcomeDismiss: "Don't show again",
    // Cross-source search
    otherSourceResults: 'Results from other sources',
    fromSource: (name) => `From ${name}`
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

export function getCurrentLang() {
  return currentLang;
}

export function t(key, ...args) {
  const dict = dictionaries[currentLang] || dictionaries['en'];
  const val = dict[key];
  if (typeof val === 'function') return val(...args);
  return val || key;
}
