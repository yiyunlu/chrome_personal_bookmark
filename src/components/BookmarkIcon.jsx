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
    return (
      <div
        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold"
        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
      >
        {fallbackChar}
      </div>
    );
  }

  return (
    <img
      src={candidates[idx]}
      alt=""
      className="w-5 h-5 rounded"
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
