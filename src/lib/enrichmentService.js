/**
 * Bookmark Enrichment Service
 *
 * Provides:
 * - Dead link detection (checks if URLs are still accessible)
 * - Auto-tag generation based on URL and title patterns
 * - Domain extraction and categorization
 */

import { getTagRules, TITLE_TAG_RULES } from './taxonomy';
import { logError } from './utils';
import { t } from './i18n';

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
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return {
      alive: response.ok,
      status: response.status,
      error: response.ok ? null : `HTTP ${response.status}`
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { alive: false, status: null, error: t('linkTimeout') };
    }
    return { alive: false, status: null, error: err.message || t('linkUnreachable') };
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

const TAG_RULES = getTagRules();

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
  } catch (err) {
    logError('enrichmentService.extractDomain', err);
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
