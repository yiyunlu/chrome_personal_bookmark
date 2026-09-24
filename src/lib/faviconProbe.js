/**
 * Tells a real favicon apart from Chrome's default globe.
 *
 * `/_favicon/?pageUrl=…` answers 200 with Chrome's own placeholder when it knows
 * no icon for the page, so `<img onError>` never fires and every icon-less
 * bookmark renders the same grey globe. The endpoint is same-origin, so we can
 * fetch the bytes and compare them against the bytes it returns for a page URL
 * that cannot possibly have an icon. Byte equality is exact — no pixel
 * heuristics, no canvas, no cross-origin tainting.
 */

const FNV_OFFSET = 0x811c9dc5;

function hashBytes(buffer) {
  const view = new Uint8Array(buffer);
  let h = FNV_OFFSET;
  for (let i = 0; i < view.length; i += 1) {
    h ^= view[i];
    h = Math.imul(h, 0x01000193);
  }
  return `${h >>> 0}:${view.length}`;
}

async function fingerprint(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return hashBytes(await res.arrayBuffer());
}

let placeholderPromise = null;

/** The fingerprint of "Chrome has no icon for this", computed once per session. */
function placeholderFingerprint(buildUrl) {
  if (!placeholderPromise) {
    // A .invalid host can never resolve, so Chrome can never hold an icon for it.
    placeholderPromise = fingerprint(buildUrl('https://no-such-host.invalid/')).catch(() => null);
  }
  return placeholderPromise;
}

/**
 * Resolves true when `url` is Chrome's placeholder. Resolves false on any error:
 * an unknown answer must not hide a real favicon.
 */
export async function isPlaceholderFavicon(url, buildUrl) {
  try {
    const [placeholder, actual] = await Promise.all([
      placeholderFingerprint(buildUrl),
      fingerprint(url)
    ]);
    if (!placeholder || !actual) return false;
    return placeholder === actual;
  } catch {
    return false;
  }
}

/** Test seam. */
export function resetPlaceholderCache() {
  placeholderPromise = null;
}
