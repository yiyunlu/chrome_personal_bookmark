export function faviconCandidates(url) {
  const extensionFavicon = `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
  return [
    extensionFavicon,
    `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`
  ];
}

export function normalizeUrlKey(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.endsWith('/') && url.pathname !== '/' ? url.pathname.slice(0, -1) : url.pathname;
    return `${url.protocol}//${host}${path}${url.search}`;
  } catch {
    return String(rawUrl || '').trim().toLowerCase();
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
