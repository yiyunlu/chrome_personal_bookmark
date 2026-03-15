import React from 'react';
import { AlertTriangle, Brain, CheckSquare, Download, Search, Sparkles, Square } from 'lucide-react';
import { t } from '../lib/i18n';

export function Toolbar({
  activeSource,
  activeSourceId,
  tabHubRootId,
  onSaveTabs,
  manageMode,
  onToggleManage,
  autoOrganizing,
  onAutoOrganize,
  onAICategorize,
  onCheckDeadLinks,
  search,
  onSearchChange,
  searchInputRef
}) {
  return (
    <header className="mb-5 space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted)' }}
        />
        <input
          ref={searchInputRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full max-w-2xl pl-9 pr-16 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
        />
        <kbd
          className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[0.65rem] border pointer-events-none"
          style={{ borderColor: 'var(--input-border)', color: 'var(--muted)' }}
        >
          /
        </kbd>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onSaveTabs}
          disabled={!activeSourceId && !tabHubRootId}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
          title={t('shortcutSaveKey')}
        >
          <Download size={14} />
          <span>{t('saveTabs')}</span>
        </button>

        <button
          type="button"
          onClick={onAutoOrganize}
          disabled={autoOrganizing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
          title={t('shortcutOrganizeKey')}
        >
          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
          <span>{autoOrganizing ? t('autoOrganizing') : t('autoOrganize')}</span>
        </button>

        <button
          type="button"
          onClick={onAICategorize}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
          title={t('shortcutAICategorize')}
        >
          <Brain size={14} style={{ color: 'var(--accent)' }} />
          <span>{t('aiCategorize')}</span>
        </button>

        <button
          type="button"
          onClick={onCheckDeadLinks}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium"
          style={{
            background: 'var(--panel-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
          title={t('shortcutDeadLink')}
        >
          <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
          <span>{t('deadLinkCheck')}</span>
        </button>

        <button
          type="button"
          onClick={onToggleManage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium"
          style={{
            background: manageMode ? 'var(--accent-soft)' : 'var(--panel-bg)',
            borderColor: manageMode ? 'var(--accent)' : 'var(--input-border)',
            color: manageMode ? 'var(--accent)' : 'var(--text)'
          }}
          title={t('shortcutManageKey')}
        >
          {manageMode ? <CheckSquare size={14} /> : <Square size={14} />}
          <span>{manageMode ? t('exitManageMode') : t('enterManageMode')}</span>
        </button>

        {activeSource && (
          <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
            {t('current')}: {activeSource.isTabHub ? 'TabHub' : activeSource.title}
          </span>
        )}
      </div>
    </header>
  );
}

export function BatchToolbar({ selectedCount, onBatchMove, onBatchTrash, onClearSelections }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-4 px-3 py-2 rounded-xl border animate-fade-in"
      style={{
        background: 'var(--accent-soft)',
        borderColor: 'var(--accent)'
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
        {t('selectedCount', selectedCount)}
      </span>
      <div className="flex-1" />
      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onBatchMove}
        className="px-2.5 py-1 rounded-lg border text-xs font-medium disabled:opacity-40"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--text)' }}
      >
        {t('batchMove')}
      </button>
      <button
        type="button"
        disabled={selectedCount === 0}
        onClick={onBatchTrash}
        className="px-2.5 py-1 rounded-lg text-xs font-medium"
        style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
      >
        {t('delete')}
      </button>
      <button
        type="button"
        onClick={onClearSelections}
        className="px-2.5 py-1 rounded-lg border text-xs"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--input-border)', color: 'var(--muted)' }}
      >
        {t('clearSelection')}
      </button>
    </div>
  );
}
