import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, EyeOff, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { getApiKey, setApiKey } from '../lib/aiService';
import { logError } from '../lib/utils';
import { DialogShell } from './DialogShell';

/* ── Token classes (P6a) ──────────────────────────────────────────────────────
   No inline `var()` left: `--panel-border` → `border-border`, `--text` →
   `text-foreground`, `--muted` → `text-muted-foreground`, `--accent` →
   `primary`, `--danger` → `text-destructive`. Geometry is the contract's
   Spacing row (header/footer `px-5 py-4`, body `p-5`) and Typography table
   (dialog title `text-base font-semibold`, meta `text-xs text-muted-foreground`).

   The API key field keeps `Input`'s own `h-9 rounded-md px-3` — the radius table
   puts controls at `rounded-md`, so P3's `rounded-lg` override is gone. Four
   classes are restated on top of it:
     · `bg-background` — the field keeps the well it had as `--input-bg` (which
       resolved to the --ui-background token); Input's own `bg-transparent` would
       flatten it into the panel's card white.
     · `shadow-none` — flat field. `shadow` is a custom scale registered in
       `src/lib/cn.js`, so this genuinely displaces `shadow-sm`.
     · `focus-visible:ring-2` — width only; the colour stays the vendored
       `focus-visible:ring-ring`, which *is* the accent (`--ui-ring` and
       `--ui-primary` are the same triplet).
     · `md:text-sm` — `Input` ships `text-base md:text-sm`, and an unprefixed
       `text-sm` deletes only `text-base`, leaving the prefixed class alive to win
       from 768px up (mechanism D). Same 14px either way here, so nothing moves —
       but the override stops being accidentally correct. */
const HEADER_CLASS = 'flex items-center justify-between border-b border-border px-5 py-4';
const TITLE_CLASS = 'text-base font-semibold text-foreground';
const CLOSE_BUTTON_CLASS = 'h-7 w-7 text-muted-foreground';
const BODY_CLASS = 'space-y-4 p-5';
const FIELD_CLASS = 'bg-background pr-9 text-sm md:text-sm shadow-none focus-visible:ring-2';
/* `leading-none` restated after `text-xs` — a later font size deletes an earlier
   line height (mechanism A) — and it is the value `Label` itself ships. */
const FIELD_LABEL_CLASS = 'mb-1.5 block text-xs font-medium leading-none text-foreground';
/* A section heading, not a field label: it names the group below it, so shadcn's
   Label here would be an orphan label element. It carries an `id` that the group
   points at with `aria-labelledby`, the treatment P5b gave the sidebar's theme
   group — the two surfaces used to diverge. */
const SECTION_HEADING_CLASS = 'mb-2 block text-xs font-medium leading-none text-foreground';
const DATA_HEADING_ID = 'tabhub-settings-data-heading';

export function SettingsModal({ open, onClose, onExport, onImport }) {
  const [apiKey, setApiKeyLocal] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setTestStatus(null);
    getApiKey().then((key) => {
      setApiKeyLocal(key || '');
      setLoaded(true);
    });
  }, [open]);

  const handleSave = useCallback(async () => {
    await setApiKey(apiKey.trim());
    setTestStatus(apiKey.trim() ? 'saved' : 'cleared');
    setTimeout(() => setTestStatus(null), 2000);
  }, [apiKey]);

  const handleTest = useCallback(async () => {
    if (!apiKey.trim()) return;
    setTestStatus('testing');
    try {
      const { callClaude } = await import('../lib/claudeClient');
      await setApiKey(apiKey.trim());
      const text = await callClaude({ prompt: 'Respond with exactly: OK', maxTokens: 10 });
      setTestStatus(text ? 'success' : 'failed');
    } catch (err) {
      logError('SettingsModal.handleTest', err);
      setTestStatus('failed');
    }
  }, [apiKey]);

  return (
    <DialogShell open={open} onClose={onClose} title={t('settings')} className="max-w-md">
      <div className={HEADER_CLASS}>
        <h2 className={TITLE_CLASS}>{t('settings')}</h2>
        <Button
          variant="ghost"
          size="icon"
          className={CLOSE_BUTTON_CLASS}
          aria-label={t('close')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className={BODY_CLASS}>
        <div>
          <Label htmlFor="tabhub-api-key" className={FIELD_LABEL_CLASS}>
            {t('apiKeyLabel')}
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="tabhub-api-key"
                // Stays a password field; the eye button below toggles it.
                type={showKey ? 'text' : 'password'}
                value={loaded ? apiKey : ''}
                onChange={(e) => setApiKeyLocal(e.target.value)}
                placeholder={t('apiKeyPlaceholder')}
                className={FIELD_CLASS}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? t('hideApiKey') : t('showApiKey')}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
              >
                {showKey ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={handleSave}>
              {t('save')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleTest} disabled={!apiKey.trim()}>
              {t('testConnection')}
            </Button>

            {testStatus === 'saved' && <span className="text-xs text-primary">{t('apiKeySaved')}</span>}
            {testStatus === 'cleared' && <span className="text-xs text-muted-foreground">{t('apiKeyCleared')}</span>}
            {testStatus === 'testing' && <span className="text-xs text-muted-foreground">...</span>}
            {testStatus === 'success' && (
              <span className="text-xs text-primary">{t('testConnectionSuccess')}</span>
            )}
            {testStatus === 'failed' && (
              <span className="text-xs text-destructive">{t('testConnectionFailed')}</span>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                apiKey.trim() ? 'bg-primary' : 'bg-muted-foreground'
              )}
            />
            <span className="text-xs text-foreground">
              {apiKey.trim() ? t('aiModeActive') : t('aiModeMock')}
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-2">
          <div id={DATA_HEADING_ID} className={SECTION_HEADING_CLASS}>
            {t('dataSection')}
          </div>
          <div role="group" aria-labelledby={DATA_HEADING_ID} className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onExport?.()}>
              <Download />
              {t('exportData')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload />
              {t('importData')}
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              aria-label={t('importData')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  onImport?.(reader.result);
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
