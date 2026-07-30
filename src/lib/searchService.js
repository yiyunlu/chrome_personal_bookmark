/**
 * Smart Search Service
 *
 * Provides enhanced search beyond simple keyword matching:
 * - Fuzzy matching (tolerates typos)
 * - Domain/category-aware search ("social media", "dev tools")
 */

import { getCategoryKeywords } from './taxonomy';

const CATEGORY_KEYWORDS = getCategoryKeywords();

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
  if (q.length < 3) return [];
  const expansions = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === q || keywords.some((kw) => kw === q || (q.length >= 4 && (kw.includes(q) || q.includes(kw))))) {
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

