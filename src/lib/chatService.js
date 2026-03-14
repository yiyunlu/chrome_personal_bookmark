/**
 * AI Chat Service
 *
 * Parses natural language commands for bookmark operations.
 * Mock mode uses pattern matching; Claude API mode uses AI.
 */

import { getApiKey } from './aiService';

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
      const query = command.params.query.toLowerCase();
      const matches = allCards.filter(
        (c) => c.title.toLowerCase().includes(query) || c.url.toLowerCase().includes(query)
      );
      if (matches.length === 0) {
        return { message: `未找到与「${command.params.query}」匹配的书签。` };
      }
      return {
        message: `找到 ${matches.length} 个匹配的书签：`,
        results: matches.slice(0, 10).map((c) => ({
          id: c.id,
          title: c.title,
          url: c.url,
          collection: c.collectionTitle || ''
        }))
      };
    }

    case COMMAND_TYPES.MOVE: {
      const { bookmarkQuery, targetCollection } = command.params;
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
      const query = command.params.bookmarkQuery.toLowerCase();
      const matches = allCards.filter(
        (c) => c.title.toLowerCase().includes(query) || c.url.toLowerCase().includes(query)
      );

      if (matches.length === 0) {
        return { message: `未找到与「${command.params.bookmarkQuery}」匹配的书签。` };
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
        const key = card.url.toLowerCase().replace(/\/$/, '');
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
  const apiKey = await getApiKey();

  if (!apiKey) {
    const command = parseCommand(message);
    return executeCommand(command, context);
  }

  // Claude-powered chat
  const { collections, allCards } = context;
  const prompt = `You are a bookmark management assistant. The user has ${allCards.length} bookmarks in ${collections.length} collections.

Collections: ${collections.map((c) => `"${c.title}" (${c.cards.length} bookmarks)`).join(', ')}

User message: "${message}"

Respond with a JSON object:
{
  "type": "search|move|delete|find_duplicates|organize|info|response",
  "message": "Chinese response to user",
  "params": {} // optional parameters for the action
}

For search: params.query = search terms
For move: params.bookmarkQuery, params.targetCollection
For delete: params.bookmarkQuery
For response: just a helpful message`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const command = parseCommand(message);
      return executeCommand(command, context);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const command = parseCommand(message);
      return executeCommand(command, context);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // If Claude returned a direct response, return it
    if (parsed.type === 'response' || !parsed.type) {
      return { message: parsed.message || '我理解了。' };
    }

    // Otherwise execute the structured command
    const command = { type: parsed.type, params: parsed.params || {} };
    const result = executeCommand(command, context);
    return { ...result, message: parsed.message || result.message };
  } catch {
    const command = parseCommand(message);
    return executeCommand(command, context);
  }
}
