/**
 * AI Service Layer
 *
 * Currently uses mock responses. To enable real AI:
 * 1. Set API key via chrome.storage.local under 'tabhub_ai_api_key'
 * 2. Replace mockCategorize() with a real Claude API call
 *
 * The service accepts bookmarks and returns categorization suggestions.
 */

import { getDomainCategory, TITLE_KEYWORDS } from './taxonomy';
import { logError } from './utils';
import { t, getCurrentLang } from './i18n';

const AI_API_KEY_STORAGE = 'tabhub_ai_api_key';

/**
 * Get the stored API key (for future use).
 */
export async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get([AI_API_KEY_STORAGE], (result) => {
      resolve(result?.[AI_API_KEY_STORAGE] || '');
    });
  });
}

/**
 * Save API key to storage (for future use).
 */
export async function setApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AI_API_KEY_STORAGE]: key }, () => resolve());
  });
}

/**
 * Categorize bookmarks into collections.
 *
 * @param {Array<{id: string, title: string, url: string, currentCollection: string}>} bookmarks
 * @param {Array<{id: string, title: string}>} existingCollections
 * @returns {Promise<{suggestions: Array<{bookmarkId: string, targetCollectionTitle: string, reason: string}>, newCollections: string[]}>}
 */
export async function categorizeBookmarks(bookmarks, existingCollections) {
  const apiKey = await getApiKey();

  if (apiKey) {
    return callClaudeAPI(bookmarks, existingCollections);
  }

  // Mock mode
  return mockCategorize(bookmarks, existingCollections);
}

async function callClaudeAPI(bookmarks, existingCollections) {
  const { callClaude, extractJsonObject } = await import('./claudeClient');
  const collectionNames = existingCollections.map((c) => c.title);

  const lang = getCurrentLang();
  const responseLang = lang === 'zh-CN' ? 'Write reasons in Chinese.' : 'Write reasons in English.';
  const prompt = `You are a bookmark organizer. Given these bookmarks and existing collections, suggest which collection each bookmark should belong to.

Existing collections: ${JSON.stringify(collectionNames)}

Bookmarks to categorize:
${bookmarks.map((b) => `- id:${b.id} | "${b.title}" (${b.url}) [currently in: ${b.currentCollection}]`).join('\n')}

Respond with a JSON object:
{
  "suggestions": [
    {"bookmarkId": "...", "targetCollectionTitle": "...", "reason": "short reason"}
  ],
  "newCollections": ["names of any new collections you'd suggest creating"]
}

Rules:
- bookmarkId must be exactly one of the id values listed above
- Prefer existing collections when possible
- Only suggest new collections if bookmarks truly don't fit existing ones
- Group by topic/domain (dev tools, reading, social, shopping, etc.)
- Keep reasons under 10 words
- ${responseLang}`;

  const text = await callClaude({ prompt, maxTokens: 2048 });
  if (!text) throw new Error('No API key set');

  const parsed = extractJsonObject(text);
  if (!parsed) throw new Error('Failed to parse AI response');
  return sanitizeCategorizeResult(parsed, bookmarks);
}

// The model's output is untrusted: drop suggestions whose bookmarkId is not one
// of the ids we sent (a hallucinated small-integer id could collide with a real
// node elsewhere in the user's bookmark tree) and coerce fields to safe shapes.
function sanitizeCategorizeResult(raw, bookmarks) {
  const knownIds = new Set(bookmarks.map((b) => String(b.id)));

  const suggestions = (Array.isArray(raw?.suggestions) ? raw.suggestions : [])
    .filter(
      (s) =>
        s &&
        knownIds.has(String(s.bookmarkId)) &&
        typeof s.targetCollectionTitle === 'string' &&
        s.targetCollectionTitle.trim()
    )
    .map((s) => ({
      bookmarkId: String(s.bookmarkId),
      targetCollectionTitle: s.targetCollectionTitle.trim(),
      reason: typeof s.reason === 'string' ? s.reason : ''
    }));

  const newCollections = (Array.isArray(raw?.newCollections) ? raw.newCollections : [])
    .filter((name) => typeof name === 'string' && name.trim())
    .map((name) => name.trim());

  return { suggestions, newCollections };
}

/**
 * Mock categorization based on URL domain patterns.
 */
async function mockCategorize(bookmarks, existingCollections) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const collectionMap = new Map(existingCollections.map((c) => [c.title.toLowerCase(), c.title]));

  const suggestions = [];
  const newCollectionsSet = new Set();

  for (const bookmark of bookmarks) {
    let category = null;
    let reason = '';

    // Try domain match via taxonomy
    try {
      const hostname = new URL(bookmark.url).hostname.replace(/^www\./, '');
      const cat = getDomainCategory(hostname);
      if (cat) {
        category = cat;
        reason = t('aiReasonDomain', hostname, cat);
      }
    } catch (err) {
      logError('aiService.mockCategorize', err);
    }

    // Try title keyword match via taxonomy
    if (!category) {
      const lowerTitle = bookmark.title.toLowerCase();
      for (const [keyword, cat] of Object.entries(TITLE_KEYWORDS)) {
        if (lowerTitle.includes(keyword)) {
          category = cat;
          reason = t('aiReasonTitle', keyword);
          break;
        }
      }
    }

    if (!category) continue;

    // Check if existing collection matches
    const existingMatch = collectionMap.get(category.toLowerCase());
    const targetTitle = existingMatch || category;

    if (!existingMatch) {
      newCollectionsSet.add(category);
    }

    // Only suggest if different from current collection
    if (bookmark.currentCollection.toLowerCase() !== targetTitle.toLowerCase()) {
      suggestions.push({
        bookmarkId: bookmark.id,
        targetCollectionTitle: targetTitle,
        reason
      });
    }
  }

  return {
    suggestions,
    newCollections: Array.from(newCollectionsSet)
  };
}
