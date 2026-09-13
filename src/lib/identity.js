/**
 * Deterministic visual identity for things that would otherwise all look alike.
 *
 * Two problems share this root. Chrome's `/_favicon/` endpoint never fails: when
 * it has no icon for a page it returns its own grey globe, so a bookmark with no
 * favicon is visually identical to every other one — and `<img onError>` never
 * fires, which is why BookmarkIcon's letter fallback had never once run. The
 * collapsed sidebar has the same shape: every folder drew the same glyph.
 *
 * The answer is the one TabHub.dc.html already chose — a tinted tile carrying one
 * or two characters. The tints below are the design's own `T` map, verbatim.
 */

const TINTS = [
  '#3b6fd4', // blue
  '#d0402c', // red
  '#2f8f5b', // green
  '#d9762a', // orange
  '#7a4fd0', // purple
  '#5a6270', // slate
  '#1f8a8a', // teal
  '#c9417f', // pink
  '#2f2b29' // dark
];

/** FNV-1a. Stable across reloads and platforms, which a tint must be. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A tint from the design's palette, stable for a given key. */
export function identityTint(key) {
  return TINTS[hash(String(key || '')) % TINTS.length];
}

const CJK = /[㐀-鿿豈-﫿぀-ヿ가-힯]/;

/**
 * One or two characters standing in for a label, following the design's own
 * examples: CJK takes a single glyph (百, 加, 拼), Latin takes the initials of
 * the first two words (CS, GH, OA) or the first two letters of a single word
 * (Pi, HF, YT).
 */
export function identityChar(label) {
  const text = String(label || '').trim();
  if (!text) return '?';

  const first = text[0];
  if (CJK.test(first)) return first;

  const words = text
    .split(/[\s\-_/|·—–:.]+/)
    .filter((w) => /[a-z0-9]/i.test(w));

  if (words.length === 0) return first.toUpperCase();
  if (words.length === 1) {
    const w = words[0].replace(/[^a-z0-9]/gi, '');
    return (w.length > 1 ? w.slice(0, 2) : w).replace(/^./, (c) => c.toUpperCase());
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Everything a tile needs, in one call. */
export function identity(label, tintKey) {
  return { char: identityChar(label), tint: identityTint(tintKey ?? label) };
}

/**
 * Identity for a bookmark. Derived from the registrable part of the host rather
 * than the title, so every bookmark on a site shares one tile and reads as a
 * group. Falls back to the title for anything that will not parse as a URL.
 */
export function identityForUrl(url, title) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }
  if (!host) return identity(title);
  // A LAN address has no registrable name, and its last octet is the only part
  // that distinguishes one box from another — which matters here, since a home
  // network folder is mostly 192.168.x.y.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { char: host.split('.').pop(), tint: identityTint(host) };
  }
  // Drop the public suffix: "one.dash.cloudflare.com" -> "cloudflare".
  const labels = host.split('.').filter(Boolean);
  const name = labels.length > 1 ? labels[labels.length - 2] : labels[0];
  return { char: identityChar(name), tint: identityTint(host) };
}
