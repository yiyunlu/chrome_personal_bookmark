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
 * Status values:
 * - 'alive': URL responded with 2xx/3xx
 * - 'dead': URL responded with a clear HTTP error (4xx, 5xx)
 * - 'unknown': Could not verify (network error, timeout, non-HTTP error)
 *
 * @param {string} url
 * @returns {Promise<{alive: boolean, status: number|null, error: string|null, linkStatus: 'alive'|'dead'|'unknown'}>}
 */
export async function checkLink(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // CORS request first: when the server sends Access-Control-Allow-Origin we
    // see the real HTTP status — the only way to confirm a link is truly dead.
    try {
      let response = await fetch(url, { method: 'HEAD', signal: controller.signal });
      if (response.status === 405 || response.status === 501) {
        // Some servers reject HEAD; retry with GET before declaring the link dead.
        response = await fetch(url, { method: 'GET', signal: controller.signal });
      }

      if (response.ok) {
        return { alive: true, status: response.status, error: null, linkStatus: 'alive' };
      }

      // Clear HTTP error responses (4xx, 5xx) are confirmed dead
      return {
        alive: false,
        status: response.status,
        error: `HTTP ${response.status}`,
        linkStatus: 'dead'
      };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      // A CORS rejection and a network failure are indistinguishable here, so
      // fall through to a no-cors probe that can still tell the two apart.
    }

    // Opaque success: the host answered but hides its HTTP status (no CORS
    // headers). Reachable, yet the status is unverifiable — never "dead".
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    return { alive: false, status: null, error: t('deadLinkUnknown'), linkStatus: 'unknown' };
  } catch (err) {
    // Network errors, timeouts, and non-HTTP errors are "unknown" — not confirmed dead
    if (err.name === 'AbortError') {
      return { alive: false, status: null, error: t('linkTimeout'), linkStatus: 'unknown' };
    }
    return { alive: false, status: null, error: err.message || t('linkUnreachable'), linkStatus: 'unknown' };
  } finally {
    // Runs on every path — the original cleared the timer only on success,
    // leaking the 8s abort timer whenever a fetch threw.
    clearTimeout(timeoutId);
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
