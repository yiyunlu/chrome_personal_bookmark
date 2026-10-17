import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { storageGet, storageSet } from '../lib/storage';
import { logError } from '../lib/utils';
import { t } from '../lib/i18n';

const DISMISS_KEY = 'tabhub_chrome_footer_hint_dismissed';

/* Manage-mode only: Chrome 138+ draws its own footer under extension new-tab
   pages and an extension cannot remove it, so this explains how the user can.
   A flex child of <main> (not fixed), so it never covers cards. Stays hidden
   until the stored flag has been read, so a dismissed hint never flashes. */
export function ChromeFooterHint({ manageMode }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let live = true;
    storageGet(DISMISS_KEY)
      .then((v) => live && setDismissed(v === true))
      .catch(() => live && setDismissed(false));
    return () => {
      live = false;
    };
  }, []);

  if (!manageMode || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    storageSet(DISMISS_KEY, true).catch(logError);
  };

  return (
    <div
      role="note"
      className="flex shrink-0 items-center gap-3 border-t border-border bg-muted px-[22px] py-1.5"
    >
      <p className="min-w-0 flex-1 text-[11.5px] text-muted-foreground">{t('chromeFooterHint')}</p>
      <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={dismiss}>
        {t('chromeFooterHintDismiss')}
      </Button>
    </div>
  );
}
