/**
 * Bookmark Enrichment Service
 *
 * Provides:
 * - Dead link detection (checks if URLs are still accessible)
 * - Auto-tag generation based on URL and title patterns
 * - Domain extraction and categorization
 */

/**
 * Check if a URL is accessible. Returns status info.
 *
 * @param {string} url
 * @returns {Promise<{alive: boolean, status: number|null, error: string|null}>}
 */
export async function checkLink(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // In no-cors mode, response.type is 'opaque' and status is 0
    // but the request succeeded, so the link is alive
    if (response.type === 'opaque') {
      return { alive: true, status: null, error: null };
    }

    return {
      alive: response.ok,
      status: response.status,
      error: response.ok ? null : `HTTP ${response.status}`
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { alive: false, status: null, error: '请求超时' };
    }
    return { alive: false, status: null, error: err.message || '无法访问' };
  }
}

/**
 * Check multiple bookmarks for dead links.
 * Processes in batches to avoid overwhelming the network.
 *
 * @param {Array<{id: string, title: string, url: string}>} bookmarks
 * @param {function} onProgress - Called with {checked, total, current} after each check
 * @returns {Promise<Array<{bookmarkId: string, title: string, url: string, alive: boolean, status: number|null, error: string|null}>>}
 */
export async function checkDeadLinks(bookmarks, onProgress) {
  const BATCH_SIZE = 5;
  const results = [];

  for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
    const batch = bookmarks.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (bookmark) => {
        const linkStatus = await checkLink(bookmark.url);
        return {
          bookmarkId: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          ...linkStatus
        };
      })
    );

    results.push(...batchResults);

    if (onProgress) {
      onProgress({
        checked: Math.min(i + BATCH_SIZE, bookmarks.length),
        total: bookmarks.length,
        current: batchResults
      });
    }
  }

  return results;
}

const TAG_RULES = [
  // Development
  { pattern: /github\.com/i, tags: ['开发', 'GitHub'] },
  { pattern: /stackoverflow\.com/i, tags: ['开发', '问答'] },
  { pattern: /npmjs\.com/i, tags: ['开发', 'npm'] },
  { pattern: /developer\.mozilla\.org/i, tags: ['开发', '文档'] },
  { pattern: /docs\./i, tags: ['文档'] },

  // Social
  { pattern: /(twitter|x)\.com/i, tags: ['社交'] },
  { pattern: /reddit\.com/i, tags: ['社交', '论坛'] },
  { pattern: /linkedin\.com/i, tags: ['社交', '职业'] },

  // Content
  { pattern: /medium\.com/i, tags: ['阅读', '博客'] },
  { pattern: /dev\.to/i, tags: ['阅读', '开发'] },
  { pattern: /youtube\.com/i, tags: ['视频'] },
  { pattern: /spotify\.com/i, tags: ['音乐'] },

  // Shopping
  { pattern: /amazon\./i, tags: ['购物'] },

  // Design
  { pattern: /figma\.com/i, tags: ['设计'] },
  { pattern: /dribbble\.com/i, tags: ['设计', '灵感'] },

  // Productivity
  { pattern: /notion\.so/i, tags: ['效率'] },
  { pattern: /docs\.google\.com/i, tags: ['效率', '文档'] }
];

const TITLE_TAG_RULES = [
  { pattern: /react/i, tags: ['React'] },
  { pattern: /vue/i, tags: ['Vue'] },
  { pattern: /angular/i, tags: ['Angular'] },
  { pattern: /typescript|ts\b/i, tags: ['TypeScript'] },
  { pattern: /javascript|js\b/i, tags: ['JavaScript'] },
  { pattern: /python/i, tags: ['Python'] },
  { pattern: /rust/i, tags: ['Rust'] },
  { pattern: /tutorial|教程/i, tags: ['教程'] },
  { pattern: /guide|指南/i, tags: ['指南'] },
  { pattern: /api\b/i, tags: ['API'] },
  { pattern: /blog|博客/i, tags: ['博客'] }
];

/**
 * Generate tags for a bookmark based on its URL and title.
 *
 * @param {{title: string, url: string}} bookmark
 * @returns {string[]}
 */
export function generateTags(bookmark) {
  const tags = new Set();
  const url = bookmark.url || '';
  const title = bookmark.title || '';

  for (const rule of TAG_RULES) {
    if (rule.pattern.test(url)) {
      rule.tags.forEach((tag) => tags.add(tag));
    }
  }

  for (const rule of TITLE_TAG_RULES) {
    if (rule.pattern.test(title)) {
      rule.tags.forEach((tag) => tags.add(tag));
    }
  }

  return Array.from(tags);
}

/**
 * Extract clean domain from URL.
 *
 * @param {string} url
 * @returns {string}
 */
export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Enrich a list of bookmarks with tags and domain info.
 *
 * @param {Array<{id: string, title: string, url: string}>} bookmarks
 * @returns {Array<{bookmarkId: string, tags: string[], domain: string}>}
 */
export function enrichBookmarks(bookmarks) {
  return bookmarks.map((bookmark) => ({
    bookmarkId: bookmark.id,
    tags: generateTags(bookmark),
    domain: extractDomain(bookmark.url)
  }));
}
