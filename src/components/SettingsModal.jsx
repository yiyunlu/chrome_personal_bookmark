import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, EyeOff, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t } from '../lib/i18n';
import { getApiKey, setApiKey } from '../lib/aiService';
import { logError } from '../lib/utils';
import { DialogShell } from './DialogShell';

// shadcn's Input is h-9/rounded-md/shadow-sm/text-base; the dialog fields are
// rounded-lg, 14px, 8px vertical padding, with the project's accent focus ring.
const FIELD_CLASS =
  'h-auto w-full rounded-lg px-3 py-2 text-sm shadow-none ' +
  'focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

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
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--panel-border)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{t('settings')}</h2>
        <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: 'var(--muted)' }}>
          <X size={18} />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <Label htmlFor="tabhub-api-key" className="block text-xs leading-normal mb-1.5" style={{ color: 'var(--text)' }}>
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
                className={FIELD_CLASS + ' pr-9'}
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? t('hideApiKey') : t('showApiKey')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--muted)' }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {t('save')}
            </button>
            <button
              onClick={handleTest}
              disabled={!apiKey.trim()}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40"
              style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
            >
              {t('testConnection')}
            </button>

            {testStatus === 'saved' && (
              <span className="text-xs" style={{ color: 'var(--accent)' }}>{t('apiKeySaved')}</span>
            )}
            {testStatus === 'cleared' && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{t('apiKeyCleared')}</span>
            )}
            {testStatus === 'testing' && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>...</span>
            )}
            {testStatus === 'success' && (
              <span className="text-xs" style={{ color: 'var(--accent)' }}>{t('testConnectionSuccess')}</span>
            )}
            {testStatus === 'failed' && (
              <span className="text-xs" style={{ color: 'var(--danger)' }}>{t('testConnectionFailed')}</span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: apiKey.trim() ? 'var(--accent)' : 'var(--muted)' }}
            />
            <span className="text-xs" style={{ color: 'var(--text)' }}>
              {apiKey.trim() ? t('aiModeActive') : t('aiModeMock')}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: 'var(--panel-border)' }}>
          {/* A section heading, not a field label: it names the two buttons
              below, so shadcn's Label here would be an orphan label element. */}
          <div className="block text-xs font-medium mb-2" style={{ color: 'var(--text)' }}>
            {t('dataSection')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
              style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
            >
              <Download size={14} />
              {t('exportData')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
              style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
            >
              <Upload size={14} />
              {t('importData')}
            </button>
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
