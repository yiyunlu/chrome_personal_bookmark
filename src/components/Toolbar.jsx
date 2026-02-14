import React from 'react';
import { t } from '../lib/i18n';

export default function Toolbar({
    activeSource,
    manageMode,
    autoOrganizing,
    search,
    searchInputRef,
    selectedCards,
    onSaveTabs,
    onToggleManageMode,
    onAutoOrganize,
    onSearchChange,
    onBatchMove,
    onBatchTrash,
    onClearSelections,
    canSave
}) {
    return (
        <>
            <header className="toolbar">
                <button
                    onClick={onSaveTabs}
                    className="primary-btn"
                    disabled={!canSave}
                >
                    {t('saveTabsTo')} {activeSource?.isTabHub ? 'TabHub' : activeSource?.title || t('currentSource')}
                </button>
                <button
                    type="button"
                    className={`secondary-btn ${manageMode ? 'secondary-btn-active' : ''}`}
                    onClick={onToggleManageMode}
                >
                    {manageMode ? t('exitManageMode') : t('enterManageMode')}
                </button>
                <button
                    type="button"
                    className="secondary-btn"
                    onClick={onAutoOrganize}
                    disabled={autoOrganizing}
                >
                    {autoOrganizing ? t('autoOrganizing') : t('autoOrganize')}
                </button>
                <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="search-input"
                />
            </header>

            <div className="quick-entry">
                <span className="quick-entry-label">{t('efficiencyEntry')}</span>
                <button type="button" className="quick-chip" onClick={() => searchInputRef.current?.focus()}>
                    {t('shortcutSearch')}
                </button>
                <button type="button" className="quick-chip" onClick={onSaveTabs}>
                    {t('shortcutSave')}
                </button>
                <button type="button" className="quick-chip" onClick={onAutoOrganize}>
                    {t('shortcutOrganize')}
                </button>
                <button type="button" className="quick-chip" onClick={onToggleManageMode}>
                    {t('shortcutManage')}
                </button>
            </div>

            {manageMode && (
                <div className="batch-toolbar">
                    <div className="batch-count">{t('selectedCount', selectedCards.length)}</div>
                    <button
                        type="button"
                        className="secondary-btn"
                        disabled={selectedCards.length === 0}
                        onClick={onBatchMove}
                    >
                        {t('batchMove')}
                    </button>
                    <button
                        type="button"
                        className="secondary-btn"
                        disabled={selectedCards.length === 0}
                        onClick={onBatchTrash}
                    >
                        {t('moveToTrash')}
                    </button>
                    <button type="button" className="secondary-btn" onClick={onClearSelections}>
                        {t('clearSelection')}
                    </button>
                </div>
            )}
        </>
    );
}
