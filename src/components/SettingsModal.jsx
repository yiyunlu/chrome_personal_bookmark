import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { t } from '../lib/i18n';
import { getApiKey, setApiKey } from '../lib/aiService';

export function SettingsModal({ open, onClose }) {
  const [apiKey, setApiKeyLocal] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);

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
    } catch {
      setTestStatus('failed');
    }
  }, [apiKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl border shadow-xl w-full max-w-md mx-4 animate-fade-in"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--panel-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{t('settings')}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
              {t('apiKeyLabel')}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={loaded ? apiKey : ''}
                  onChange={(e) => setApiKeyLocal(e.target.value)}
                  placeholder={t('apiKeyPlaceholder')}
                  className="w-full px-3 py-2 pr-9 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
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
        </div>
      </div>
    </div>
  );
}
