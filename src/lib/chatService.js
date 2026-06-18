/**
 * AI Chat Service
 *
 * Parses natural language commands for bookmark operations.
 * Mock mode uses pattern matching; Claude API mode uses AI.
 */

import { normalizeUrlKey, logError } from './utils';
import { smartSearch } from './searchService';
import { t, getCurrentLang } from './i18n';

/**
 * Command types the chat can produce.
 */
export const COMMAND_TYPES = {
  SEARCH: 'search',
  MOVE: 'move',
  DELETE: 'delete',
  FIND_DUPLICATES: 'find_duplicates',
  ORGANIZE: 'organize',
  INFO: 'info',
  UNKNOWN: 'unknown'
};

const PATTERNS = [
  {
    regex: /(?:搜索|查找|找|search|find)\s+(.+)/i,
    type: COMMAND_TYPES.SEARCH,
    extract: (m) => ({ query: m[1].trim() })
  },
  {
    regex: /(?:移动|move)\s+(.+?)\s+(?:到|to)\s+(.+)/i,
    type: COMMAND_TYPES.MOVE,
    extract: (m) => ({ bookmarkQuery: m[1].trim(), targetCollection: m[2].trim() })
  },
  {
    regex: /(?:删除|delete|remove)\s+(.+)/i,
    type: COMMAND_TYPES.DELETE,
    extract: (m) => ({ bookmarkQuery: m[1].trim() })
  },
  {
    regex: /(?:去重|查找重复|重复|duplicates|find duplicates)/i,
    type: COMMAND_TYPES.FIND_DUPLICATES,
    extract: () => ({})
  },
  {
    regex: /(?:整理|organize|分类|categorize|sort)/i,
    type: COMMAND_TYPES.ORGANIZE,
    extract: () => ({})
  },
  {
    regex: /(?:多少|几个|数量|统计|count|how many|stats)\s*(.*)/i,
    type: COMMAND_TYPES.INFO,
    extract: (m) => ({ query: (m[1] || '').trim() })
  }
];

/**
 * Parse a natural language message into a structured command.
 *
 * @param {string} message
 * @returns {{type: string, params: object}}
 */
export function parseCommand(message) {
  const trimmed = message.trim();
  if (!trimmed) return { type: COMMAND_TYPES.UNKNOWN, params: {} };

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      return { type: pattern.type, params: pattern.extract(match) };
    }
  }

  // Default: treat as search
  return { type: COMMAND_TYPES.SEARCH, params: { query: trimmed } };
}

/**
 * Execute a parsed command against bookmark data.
 *
 * @param {{type: string, params: object}} command
 * @param {{collections: Array, allCards: Array}} context
 * @returns {{message: string, results?: Array, action?: string}}
 */
export function executeCommand(command, context) {
  const { collections, allCards } = context;

  switch (command.type) {
    case COMMAND_TYPES.SEARCH: {
      const searchQuery = command.params?.query || '';
      if (!searchQuery) return { message: t('chatEnterSearchQuery') };
      const searchResults = smartSearch(searchQuery, allCards);
      if (searchResults.length === 0) {
        return { message: t('chatNoResults', searchQuery) };
      }
      return {
        message: t('chatFoundBookmarks', searchResults.length),
        results: searchResults.slice(0, 10).map((r) => ({
          id: r.bookmark.id,
          title: r.bookmark.title,
          url: r.bookmark.url,
          collection: r.bookmark.collectionTitle || ''
        }))
      };
    }

    case COMMAND_TYPES.MOVE: {
      const bookmarkQuery = command.params?.bookmarkQuery || '';
      const targetCollection = command.params?.targetCollection || '';
      if (!bookmarkQuery || !targetCollection) return { message: t('chatSpecifyMoveTarget') };
      const query = bookmarkQuery.toLowerCase();
      const matches = allCards.filter(
        (c) => c.title.toLowerCase().includes(query) || c.url.toLowerCase().includes(query)
      );
      const target = collections.find((c) => c.title.toLowerCase().includes(targetCollection.toLowerCase()));

      if (matches.length === 0) {
        return { message: t('chatNoResults', bookmarkQuery) };
      }
      if (!target) {
        return { message: t('chatCollectionNotFound', targetCollection) };
      }

      return {
        message: t('chatWillMove', matches.length, target.title),
        action: 'move',
        results: matches.slice(0, 20).map((c) => ({ id: c.id, title: c.title })),
        targetCollectionId: target.id,
        targetCollectionTitle: target.title
      };
    }

    case COMMAND_TYPES.DELETE: {
      const deleteQuery = command.params?.bookmarkQuery || '';
      if (!deleteQuery) return { message: t('chatSpecifyDeleteTarget') };
      const query = deleteQuery.toLowerCase();
      const matches = allCards.filter(
        (c) => c.title.toLowerCase().includes(query) || c.url.toLowerCase().includes(query)
      );

      if (matches.length === 0) {
        return { message: t('chatNoResults', deleteQuery) };
      }

      return {
        message: t('chatConfirmDelete', matches.length),
        action: 'delete',
        results: matches.slice(0, 20).map((c) => ({ id: c.id, title: c.title, url: c.url }))
      };
    }

    case COMMAND_TYPES.FIND_DUPLICATES: {
      const seen = new Map();
      const duplicates = [];
      for (const card of allCards) {
        const key = normalizeUrlKey(card.url);
        if (seen.has(key)) {
          duplicates.push(card);
        } else {
          seen.set(key, card);
        }
      }

      if (duplicates.length === 0) {
        return { message: t('chatNoDuplicates') };
      }

      return {
        message: t('chatFoundDuplicates', duplicates.length),
        results: duplicates.slice(0, 10).map((c) => ({
          id: c.id,
          title: c.title,
          url: c.url,
          collection: c.collectionTitle || ''
        })),
        action: 'delete'
      };
    }

    case COMMAND_TYPES.ORGANIZE: {
      return {
        message: t('chatUseToolbar'),
        action: 'organize'
      };
    }

    case COMMAND_TYPES.INFO: {
      const totalBookmarks = allCards.length;
      const totalCollections = collections.length;
      const byCollection = {};
      for (const card of allCards) {
        const col = card.collectionTitle || 'Unfiled';
        byCollection[col] = (byCollection[col] || 0) + 1;
      }

      let info = t('chatStats', totalBookmarks, totalCollections) + '\n';
      const top5 = Object.entries(byCollection)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (top5.length > 0) {
        info += '\n' + t('chatTopCollections') + '\n';
        for (const [name, count] of top5) {
          info += t('chatCollectionCount', name, count) + '\n';
        }
      }

      return { message: info.trim() };
    }

    default:
      return { message: t('chatUnknownCommand') };
  }
}

/**
 * Process a chat message using Claude API for natural language understanding.
 * Falls back to pattern matching when no API key.
 *
 * @param {string} message
 * @param {{collections: Array, allCards: Array}} context
 * @returns {Promise<{message: string, results?: Array, action?: string}>}
 */
export async function processChat(message, context) {
  try {
    const { callClaude, extractJsonObject } = await import('./claudeClient');
    const { collections, allCards } = context;

    const lang = getCurrentLang();
    const responseLang = lang === 'zh-CN' ? 'Respond in Chinese.' : 'Respond in English.';
    const prompt = `You are a bookmark management assistant. The user has ${allCards.length} bookmarks in ${collections.length} collections.

Collections: ${collections.map((c) => `"${c.title}" (${c.cards.length} bookmarks)`).join(', ')}

User message: "${message}"

Respond with a JSON object:
{
  "type": "search|move|delete|find_duplicates|organize|info|response",
  "params": {}
}

For search: params.query = search terms
For move: params.bookmarkQuery, params.targetCollection
For delete: params.bookmarkQuery
For response: just a helpful message, no params needed
${responseLang}`;

    const text = await callClaude({ prompt });

    if (!text) {
      const command = parseCommand(message);
      return executeCommand(command, context);
    }

    const parsed = extractJsonObject(text);
    if (!parsed) {
      const command = parseCommand(message);
      return executeCommand(command, context);
    }

    if (parsed.type === 'response' || !parsed.type) {
      return { message: parsed.message || t('chatUnderstood') };
    }

    const command = { type: parsed.type, params: parsed.params || {} };
    return executeCommand(command, context);
  } catch (err) {
    logError('chatService.processChat', err);
    const command = parseCommand(message);
    return executeCommand(command, context);
  }
}
