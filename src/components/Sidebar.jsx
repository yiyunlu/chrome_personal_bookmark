import React from 'react';
import { Bookmark, ChevronLeft, ChevronRight, FolderOpen, Globe, GripVertical, Monitor, Moon, Sun } from 'lucide-react';
import { t } from '../lib/i18n';

export function Sidebar({
  sources,
  activeSourceId,
  onSourceChange,
  themeMode,
  onThemeModeChange,
  languageSetting,
  onLanguageChange,
  collections,
  activeCollectionId,
  onCollectionSelect,
  canSortCollections,
  onCollectionContextMenu,
  collapsed,
  onToggleCollapse
}) {
  const themeOptions = [
    { value: 'system', icon: Monitor, label: t('themeSystem') },
    { value: 'light', icon: Sun, label: t('themeLight') },
    { value: 'dark', icon: Moon, label: t('themeDark') }
  ];
  return (
    <aside
      className="flex flex-col flex-shrink-0 min-h-screen border-r border-[var(--panel-border)] select-none"
      style={{
        width: collapsed ? '3.5rem' : '16rem',
        background: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'var(--accent-soft)' }}
            >
              <Bookmark size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide">TabHub</div>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:opacity-80"
          style={{ background: 'var(--sidebar-hover)' }}
          title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Source selector */}
          <div className="px-3 mb-3">
            <label className="block text-[0.68rem] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
              {t('bookmarkSource')}
            </label>
            <select
              className="w-full text-sm rounded-lg border px-2.5 py-1.5 outline-none"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text)'
              }}
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

          {/* Theme toggle */}
          <div className="px-3 mb-4">
            <label className="block text-[0.68rem] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
              {t('theme')}
            </label>
            <div
              className="flex rounded-lg border p-0.5"
              style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }}
            >
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => onThemeModeChange(value)}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-xs"
                  style={{
                    background: themeMode === value ? 'var(--accent-soft)' : 'transparent',
                    color: themeMode === value ? 'var(--accent)' : 'var(--muted)'
                  }}
                  title={label}
                >
                  <Icon size={13} />
                  {collapsed ? null : <span className="hidden sm:inline">{label}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Language selector */}
          <div className="px-3 mb-4">
            <label className="block text-[0.68rem] uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
              {t('language')}
            </label>
            <select
              className="w-full text-sm rounded-lg border px-2.5 py-1.5 outline-none"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text)'
              }}
              value={languageSetting}
              onChange={(e) => onLanguageChange(e.target.value)}
            >
              <option value="auto">{t('langAuto')}</option>
              <option value="zh-CN">{t('langZh')}</option>
              <option value="en">{t('langEn')}</option>
            </select>
          </div>

          {/* Divider */}
          <div className="mx-3 mb-2 border-t" style={{ borderColor: 'var(--panel-border)' }} />

          {/* Collections nav */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-0.5" data-nav-sortable="true">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left"
              style={{
                background: activeCollectionId === 'all' ? 'var(--sidebar-active)' : 'transparent',
                color: activeCollectionId === 'all' ? 'var(--accent)' : 'inherit',
                fontWeight: activeCollectionId === 'all' ? 600 : 400
              }}
              onClick={() => onCollectionSelect('all')}
            >
              <Bookmark size={15} style={{ opacity: 0.7 }} />
              <span className="truncate">{t('allCollections')}</span>
            </button>

            {collections.map((collection) => {
              const isActive = activeCollectionId === collection.id;
              const isDraggable = canSortCollections && collection.editable && collection.parentId === activeSourceId;
              return (
                <button
                  key={collection.id}
                  data-collection-id={collection.id}
                  data-draggable={String(isDraggable)}
                  className="group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left"
                  style={{
                    background: isActive ? 'var(--sidebar-active)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'inherit',
                    fontWeight: isActive ? 600 : 400
                  }}
                  onClick={() => onCollectionSelect(collection.id)}
                  onContextMenu={(e) => onCollectionContextMenu(e, collection)}
                  title={collection.editable || collection.deletable ? t('rightClickHint') : ''}
                >
                  <span
                    className="nav-drag-handle flex-shrink-0 opacity-0 group-hover:opacity-40 cursor-grab"
                    style={{ visibility: isDraggable ? 'visible' : 'hidden' }}
                  >
                    <GripVertical size={13} />
                  </span>
                  <FolderOpen size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <span className="truncate flex-1">{collection.title}</span>
                  <span className="text-[0.65rem] tabular-nums flex-shrink-0" style={{ color: 'var(--muted)' }}>
                    {collection.cards.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </>
      )}
    </aside>
  );
}
