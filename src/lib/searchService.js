/**
 * Smart Search Service
 *
 * Provides enhanced search beyond simple keyword matching:
 * - Fuzzy matching (tolerates typos)
 * - Domain/category-aware search ("social media", "dev tools")
 * - Natural language queries ("that react article", "shopping sites")
 *
 * When an API key is set, uses Claude for semantic search.
 * Otherwise falls back to local smart matching.
 */

import { getApiKey } from './aiService';

const CATEGORY_KEYWORDS = {
  development: ['github', 'stackoverflow', 'npmjs', 'developer', 'code', 'programming', 'dev', 'api', 'sdk'],
  'social media': ['twitter', 'x.com', 'reddit', 'facebook', 'instagram', 'linkedin', 'social', 'mastodon'],
  reading: ['medium', 'dev.to', 'news', 'blog', 'article', 'ycombinator', 'substack'],
  shopping: ['amazon', 'ebay', 'shop', 'store', 'buy', 'price', 'deal'],
  video: ['youtube', 'vimeo', 'twitch', 'video', 'watch', 'stream'],
  music: ['spotify', 'soundcloud', 'music', 'playlist', 'audio'],
  design: ['figma', 'dribbble', 'behance', 'design', 'ui', 'ux'],
  productivity: ['notion', 'docs.google', 'trello', 'asana', 'calendar', 'tool'],
  learning: ['tutorial', 'course', 'learn', 'education', 'udemy', 'coursera'],
  reference: ['docs', 'documentation', 'wiki', 'reference', 'manual', 'mdn']
};

/**
 * Compute a simple fuzzy match score between query and text.
 * Returns 0 (no match) to 1 (exact match).
 */
function fuzzyScore(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact substring match — best score
  if (t.includes(q)) return 1;

  // Check if all characters of query appear in order in text
  let qi = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (ti === lastMatchIdx + 1) consecutiveBonus += 0.1;
      lastMatchIdx = ti;
      qi++;
    }
  }

  if (qi < q.length) return 0;

  // Score based on how many characters matched relative to text length
  const baseScore = q.length / Math.max(t.length, q.length);
  return Math.min(0.9, baseScore + consecutiveBonus);
}

/**
 * Check if query matches a category concept.
 * Returns matching bookmark fields to search.
 */
function expandCategoryQuery(query) {
  const q = query.toLowerCase().trim();
  const expansions = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Check if query matches category name or any keyword
    if (category.includes(q) || keywords.some((kw) => kw.includes(q) || q.includes(kw))) {
      expansions.push(...keywords);
    }
  }

  return [...new Set(expansions)];
}

/**
 * Smart search: score and rank bookmarks against a query.
 *
 * @param {string} query - User search input
 * @param {Array<{id: string, title: string, url: string, collectionId?: string, collectionTitle?: string}>} bookmarks
 * @returns {Array<{bookmark: object, score: number, matchReason: string}>}
 */
export function smartSearch(query, bookmarks) {
  if (!query.trim()) return [];

  const q = query.trim().toLowerCase();
  const categoryExpansions = expandCategoryQuery(q);
  const results = [];

  for (const bookmark of bookmarks) {
    const title = bookmark.title || '';
    const url = bookmark.url || '';
    const collection = bookmark.collectionTitle || '';

    let bestScore = 0;
    let matchReason = '';

    // 1. Exact title match
    const titleScore = fuzzyScore(q, title);
    if (titleScore > bestScore) {
      bestScore = titleScore;
      matchReason = titleScore === 1 ? '标题匹配' : '标题模糊匹配';
    }

    // 2. URL match
    const urlScore = fuzzyScore(q, url) * 0.8; // slightly lower weight
    if (urlScore > bestScore) {
      bestScore = urlScore;
      matchReason = '网址匹配';
    }

    // 3. Collection name match
    const collectionScore = fuzzyScore(q, collection) * 0.7;
    if (collectionScore > bestScore) {
      bestScore = collectionScore;
      matchReason = '分类匹配';
    }

    // 4. Category expansion match
    if (categoryExpansions.length > 0) {
      for (const expansion of categoryExpansions) {
        const expTitleScore = title.toLowerCase().includes(expansion) ? 0.6 : 0;
        const expUrlScore = url.toLowerCase().includes(expansion) ? 0.55 : 0;
        const expScore = Math.max(expTitleScore, expUrlScore);
        if (expScore > bestScore) {
          bestScore = expScore;
          matchReason = '语义匹配';
        }
      }
    }

    if (bestScore > 0.15) {
      results.push({ bookmark, score: bestScore, matchReason });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * AI-powered semantic search using Claude API.
 * Falls back to local smartSearch when no API key.
 *
 * @param {string} query
 * @param {Array} bookmarks
 * @returns {Promise<Array<{bookmark: object, score: number, matchReason: string}>>}
 */
export async function semanticSearch(query, bookmarks) {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return smartSearch(query, bookmarks);
  }

  // Claude-powered search
  const prompt = `You are a bookmark search engine. Given a natural language query and a list of bookmarks, return the IDs of bookmarks that match the query, ranked by relevance.

Query: "${query}"

Bookmarks:
${bookmarks
  .slice(0, 100) // Limit to prevent token overflow
  .map((b) => `- id:${b.id} title:"${b.title}" url:${b.url}`)
  .join('\n')}

Respond with a JSON array of objects: [{"id": "...", "reason": "short reason"}]
Only include relevant matches. Return empty array if nothing matches.`;

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
      // Fall back to local search on API error
      return smartSearch(query, bookmarks);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return smartSearch(query, bookmarks);

    const matches = JSON.parse(jsonMatch[0]);
    const bookmarkMap = new Map(bookmarks.map((b) => [b.id, b]));

    return matches
      .map((m, idx) => {
        const bookmark = bookmarkMap.get(m.id);
        if (!bookmark) return null;
        return {
          bookmark,
          score: 1 - idx * 0.05, // Rank-based score
          matchReason: m.reason || 'AI 匹配'
        };
      })
      .filter(Boolean);
  } catch {
    return smartSearch(query, bookmarks);
  }
}
