import React from 'react';
import { t } from '../lib/i18n';

export default function Sidebar({
    sources,
    activeSourceId,
    collections,
    activeCollectionId,
    canSortCollections,
    themeMode,
    languageSetting,
    onSourceChange,
    onThemeChange,
    onLanguageChange,
    onCollectionSelect,
    onCollectionContextMenu
}) {
    return (
        <aside className="sidebar">
            <div className="mb-5">
                <div className="text-xl font-semibold tracking-wide">{t('appTitle')}</div>
                <div className="text-xs opacity-70 mt-1">{t('appSubtitle')}</div>
            </div>

            <div className="mb-4">
                <label className="control-label">{t('bookmarkSource')}</label>
                <select
                    className="input-control"
                    value={activeSourceId}
                    onChange={(e) => onSourceChange(e.target.value)}
                >
                    {sources.map((source) => (
                        <option key={source.id} value={source.id}>
                            {source.isTabHub ? 'TabHub' : source.title}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label className="control-label">{t('theme')}</label>
                <select
                    className="input-control"
                    value={themeMode}
                    onChange={(e) => onThemeChange(e.target.value)}
                >
                    <option value="system">{t('themeSystem')}</option>
                    <option value="light">{t('themeLight')}</option>
                    <option value="dark">{t('themeDark')}</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="control-label">{t('language')}</label>
                <select
                    className="input-control"
                    value={languageSetting}
                    onChange={(e) => onLanguageChange(e.target.value)}
                >
                    <option value="auto">{t('langAuto')}</option>
                    <option value="zh-CN">{t('langZh')}</option>
                    <option value="en">{t('langEn')}</option>
                </select>
            </div>

            <nav className="sidebar-nav space-y-1" data-nav-sortable="true">
                <button
                    className={`nav-btn ${activeCollectionId === 'all' ? 'nav-btn-active' : ''}`}
                    onClick={() => onCollectionSelect('all')}
                >
                    {t('allCollections')}
                </button>
                {collections.map((collection) => (
                    <button
                        key={collection.id}
                        data-collection-id={collection.id}
                        data-draggable={String(canSortCollections && collection.editable && collection.parentId === activeSourceId)}
                        className={`nav-btn ${activeCollectionId === collection.id ? 'nav-btn-active' : ''}`}
                        onClick={() => onCollectionSelect(collection.id)}
                        onContextMenu={(e) => onCollectionContextMenu(e, collection)}
                        title={collection.editable || collection.deletable ? t('rightClickHint') : t('systemFolder')}
                    >
                        <span className="nav-btn-inner">
                            <span className="nav-drag-handle" aria-hidden="true">⋮⋮</span>
                            <span className="truncate">{collection.title}</span>
                        </span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}
