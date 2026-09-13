import React, { useEffect, useMemo, useState } from 'react';
import { faviconCandidates } from '../lib/utils';
import { identityForUrl } from '../lib/identity';
import { isPlaceholderFavicon } from '../lib/faviconProbe';

/**
 * A favicon when one exists, a deterministic identity tile when one does not.
 *
 * The tile is not just an error path. Chrome's `/_favicon/` endpoint answers 200
 * with its own grey globe for any page it has no icon for, so `onError` never
 * fires and every icon-less bookmark used to render the same placeholder — the
 * letter fallback that has been in this file all along had never once run.
 * `isPlaceholderFavicon` compares the returned bytes against the bytes Chrome
 * serves for an unresolvable host, which is exact rather than heuristic.
 */
export function BookmarkIcon({ url, title }) {
  const candidates = useMemo(() => faviconCandidates(url), [url]);
  const { char, tint } = useMemo(() => identityForUrl(url, title), [url, title]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [url]);

  const src = candidates[idx];

  useEffect(() => {
    if (!src || failed) return undefined;
    let cancelled = false;
    isPlaceholderFavicon(src, (probeUrl) => faviconCandidates(probeUrl)[0]).then((isPlaceholder) => {
      if (!cancelled && isPlaceholder) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src, failed]);

  if (failed || !src) {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-sm font-mono text-[10.5px] font-medium text-white"
        style={{ backgroundColor: tint }}
        aria-hidden="true"
      >
        {char}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="h-5 w-5 rounded-sm"
      draggable="false"
      onError={() => {
        if (idx < candidates.length - 1) {
          setIdx((prev) => prev + 1);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
