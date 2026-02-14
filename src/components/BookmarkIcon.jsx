import React, { useEffect, useMemo, useState } from 'react';

function faviconCandidates(url) {
    const extensionFavicon = `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
    return [
        extensionFavicon,
        `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`
    ];
}

export default function BookmarkIcon({ url, title }) {
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
