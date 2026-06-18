/**
 * AI Chat Service
 *
 * Parses natural language commands for bookmark operations.
 * Mock mode uses pattern matching; Claude API mode uses AI.
 */

import { normalizeUrlKey } from './utils';
import { smartSearch } from './searchService';

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
      if (!searchQuery) return { message: '请输入搜索关键词。' };
      const searchResults = smartSearch(searchQuery, allCards);
      if (searchResults.length === 0) {
        return { message: `未找到与「${searchQuery}」匹配的书签。` };
      }
      return {
        message: `找到 ${searchResults.length} 个匹配的书签：`,
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
      if (!bookmarkQuery || !targetCollection) return { message: '请指定要移动的书签和目标分类。' };
      const query = bookmarkQuery.toLowerCase();
      const matches = allCards.filter(
        (c) => c.title.toLowerCase().includes(query) || c.url.toLowerCase().includes(query)
      );
      const target = collections.find((c) => c.title.toLowerCase().includes(targetCollection.toLowerCase()));

      if (matches.length === 0) {
        return { message: `未找到与「${bookmarkQuery}」匹配的书签。` };
      }
      if (!target) {
        return { message: `未找到名为「${targetCollection}」的分类。` };
      }

      return {
        message: `将移动 ${matches.length} 个书签到「${target.title}」。`,
        action: 'move',
        results: matches.slice(0, 20).map((c) => ({ id: c.id, title: c.title })),
        targetCollectionId: target.id,
        targetCollectionTitle: target.title
      };
    }

    case COMMAND_TYPES.DELETE: {
      const deleteQuery = command.params?.bookmarkQuery || '';
      if (!deleteQuery) return { message: '请指定要删除的书签。' };
      const query = deleteQuery.toLowerCase();
      const matches = allCards.filter(
        (c) => c.title.toLowerCase().includes(query) || c.url.toLowerCase().includes(query)
      );

      if (matches.length === 0) {
        return { message: `未找到与「${deleteQuery}」匹配的书签。` };
      }

      return {
        message: `找到 ${matches.length} 个匹配的书签，确认删除？`,
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
        return { message: '未发现重复书签。' };
      }

      return {
        message: `发现 ${duplicates.length} 个重复书签：`,
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
        message: '请使用工具栏中的「AI 分类」或「自动整理」按钮来整理书签。',
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

      let info = `共 ${totalBookmarks} 个书签，${totalCollections} 个分类。\n`;
      const top5 = Object.entries(byCollection)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (top5.length > 0) {
        info += '\n书签最多的分类：\n';
        for (const [name, count] of top5) {
          info += `  ${name}: ${count} 个\n`;
        }
      }

      return { message: info.trim() };
    }

    default:
      return { message: '抱歉，我不太理解这个指令。试试「搜索 React」或「查找重复」。' };
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
For response: just a helpful message, no params needed`;

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
      return { message: parsed.message || '我理解了。' };
    }

    const command = { type: parsed.type, params: parsed.params || {} };
    return executeCommand(command, context);
  } catch {
    const command = parseCommand(message);
    return executeCommand(command, context);
  }
}
