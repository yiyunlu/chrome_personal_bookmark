/**
 * AI Service Layer
 *
 * Currently uses mock responses. To enable real AI:
 * 1. Set API key via chrome.storage.local under 'tabhub_ai_api_key'
 * 2. Replace mockCategorize() with a real Claude API call
 *
 * The service accepts bookmarks and returns categorization suggestions.
 */

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
    return callClaudeAPI(bookmarks, existingCollections, apiKey);
  }

  // Mock mode
  return mockCategorize(bookmarks, existingCollections);
}

/**
 * Real Claude API call (placeholder — to be implemented).
 */
async function callClaudeAPI(bookmarks, existingCollections, apiKey) {
  const collectionNames = existingCollections.map((c) => c.title);

  const prompt = `You are a bookmark organizer. Given these bookmarks and existing collections, suggest which collection each bookmark should belong to.

Existing collections: ${JSON.stringify(collectionNames)}

Bookmarks to categorize:
${bookmarks.map((b) => `- "${b.title}" (${b.url}) [currently in: ${b.currentCollection}]`).join('\n')}

Respond with a JSON object:
{
  "suggestions": [
    {"bookmarkId": "...", "targetCollectionTitle": "...", "reason": "short reason"}
  ],
  "newCollections": ["names of any new collections you'd suggest creating"]
}

Rules:
- Prefer existing collections when possible
- Only suggest new collections if bookmarks truly don't fit existing ones
- Group by topic/domain (dev tools, reading, social, shopping, etc.)
- Keep reasons under 10 words`;

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
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Mock categorization based on URL domain patterns.
 */
async function mockCategorize(bookmarks, existingCollections) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const collectionMap = new Map(existingCollections.map((c) => [c.title.toLowerCase(), c.title]));

  const domainCategories = {
    'github.com': 'Development',
    'stackoverflow.com': 'Development',
    'npmjs.com': 'Development',
    'developer.mozilla.org': 'Development',
    'medium.com': 'Reading',
    'dev.to': 'Reading',
    'news.ycombinator.com': 'Reading',
    'reddit.com': 'Social',
    'twitter.com': 'Social',
    'x.com': 'Social',
    'youtube.com': 'Media',
    'spotify.com': 'Media',
    'amazon.com': 'Shopping',
    'docs.google.com': 'Productivity',
    'notion.so': 'Productivity',
    'figma.com': 'Design',
    'dribbble.com': 'Design'
  };

  const titleKeywords = {
    react: 'Development',
    vue: 'Development',
    javascript: 'Development',
    typescript: 'Development',
    python: 'Development',
    api: 'Development',
    tutorial: 'Learning',
    course: 'Learning',
    recipe: 'Lifestyle',
    travel: 'Lifestyle',
    news: 'Reading',
    blog: 'Reading'
  };

  const suggestions = [];
  const newCollectionsSet = new Set();

  for (const bookmark of bookmarks) {
    let category = null;
    let reason = '';

    // Try domain match
    try {
      const hostname = new URL(bookmark.url).hostname.replace(/^www\./, '');
      for (const [domain, cat] of Object.entries(domainCategories)) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          category = cat;
          reason = `${domain} 属于${cat}`;
          break;
        }
      }
    } catch {}

    // Try title keyword match
    if (!category) {
      const lowerTitle = bookmark.title.toLowerCase();
      for (const [keyword, cat] of Object.entries(titleKeywords)) {
        if (lowerTitle.includes(keyword)) {
          category = cat;
          reason = `标题包含「${keyword}」`;
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
