import React from 'react';
import { Bookmark, FolderPlus, Sparkles, X } from 'lucide-react';
import { t } from '../lib/i18n';

export function WelcomeCard({ onSaveTabs, onCreateCollection, onConnectAI, onDismiss }) {
  return (
    <div
      className="rounded-2xl border p-8 max-w-lg mx-auto mt-12 animate-fade-in"
      style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}
    >
      {/* Dismiss button */}
      <div className="flex justify-end -mt-4 -mr-4">
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted)' }}
          title={t('welcomeDismiss')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">📑</div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          {t('welcomeTitle')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {t('welcomeMessage')}
        </p>
      </div>

      {/* CTA buttons */}
      <div className="space-y-3">
        <button
          onClick={onSaveTabs}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--accent)',
            borderColor: 'var(--accent)',
            color: '#fff'
          }}
        >
          <Bookmark size={18} />
          <span>{t('welcomeSaveTabs')}</span>
        </button>

        <button
          onClick={onCreateCollection}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--text)'
          }}
        >
          <FolderPlus size={18} style={{ color: 'var(--accent)' }} />
          <span>{t('welcomeCreateCollection')}</span>
        </button>

        <button
          onClick={onConnectAI}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors hover:opacity-90"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--text)'
          }}
        >
          <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          <span>{t('welcomeConnectAI')}</span>
        </button>
      </div>

      {/* Don't show again */}
      <div className="text-center mt-4">
        <button
          onClick={onDismiss}
          className="text-xs hover:underline transition-opacity"
          style={{ color: 'var(--muted)' }}
        >
          {t('welcomeDismiss')}
        </button>
      </div>
    </div>
  );
}
