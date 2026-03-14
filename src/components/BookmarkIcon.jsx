import React, { useEffect, useMemo, useState } from 'react';
import { faviconCandidates } from '../lib/utils';

export function BookmarkIcon({ url, title }) {
  const candidates = useMemo(() => faviconCandidates(url), [url]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [url]);

  const fallbackChar = (title || 'L').trim().charAt(0).toUpperCase();

  if (failed) {
    return <div className="icon-fallback">{fallbackChar}</div>;
  }

  return (
    <img
      src={candidates[idx]}
      alt=""
      className="h-5 w-5 rounded"
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
