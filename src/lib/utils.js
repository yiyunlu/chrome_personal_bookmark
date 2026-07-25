/**
 * Consistent error logging across the codebase.
 * @param {string} context - Where the error occurred (e.g. 'aiService.categorize')
 * @param {unknown} err - The caught error
 */
export function logError(context, err) {
  console.warn(`[TabHub] ${context}:`, err);
}

export function faviconCandidates(url) {
  const extensionFavicon = `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
  // The fallback goes to a third party — send only the domain, never the full
  // URL (paths/query strings can carry tokens or private data).
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    // Not a parseable URL: skip the external fallback entirely.
  }
  return domain
    ? [extensionFavicon, `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`]
    : [extensionFavicon];
}

// Canonical dedup key: protocol-insensitive, hostname lowercased, trailing
// slash trimmed (except root). Path/query case is preserved — URL paths are
// case-sensitive, so /User/Repo and /user/repo must stay distinct keys.
export function normalizeUrlKey(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.endsWith('/') && url.pathname !== '/' ? url.pathname.slice(0, -1) : url.pathname;
    return `${host}${path}${url.search}`;
  } catch {
    // Not a parseable URL is an ordinary fallback here, not an error worth logging.
    return String(rawUrl || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');
  }
}

export function sortSnapshots(items) {
  return [...items].sort((a, b) => {
    if (a.parentId === b.parentId) {
      return (a.index ?? 0) - (b.index ?? 0);
    }
    return String(a.parentId).localeCompare(String(b.parentId));
  });
}
