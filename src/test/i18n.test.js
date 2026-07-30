import { describe, it, expect, vi, beforeEach } from 'vitest';
import { t, setLanguage, getCurrentLang, initLanguage } from '../lib/i18n';

describe('i18n', () => {
  beforeEach(async () => {
    // Reset to Chinese before each test
    chrome.storage.local.set = vi.fn((_obj, cb) => cb && cb());
    await setLanguage('zh-CN');
  });

  describe('t() — Chinese (default)', () => {
    it('returns Chinese text for known keys', () => {
      expect(t('appSubtitle')).toBe('我的收藏');
      expect(t('loading')).toBe('加载中...');
      expect(t('cancel')).toBe('取消');
      expect(t('save')).toBe('保存');
    });

    it('returns function results with parameters substituted', () => {
      expect(t('selectedCount', 5)).toBe('已选 5 项');
      expect(t('movedBookmarks', 3)).toBe('已移动 3 个书签');
      expect(t('confirmDeleteBookmark', 'My Page')).toBe('删除书签：My Page ?');
    });

    it('handles multi-parameter functions', () => {
      expect(t('autoOrganizeResult', 2, 10)).toBe('自动整理完成：去重 2，重排 10');
      expect(t('aiSummary', 4, 6)).toBe('4 项已接受，6 项待确认');
      expect(t('importSuccess', 3, 15)).toBe('已导入 3 个集合，15 个书签');
    });
  });

  describe('setLanguage() and getCurrentLang()', () => {
    it('switches to English', async () => {
      await setLanguage('en');
      expect(getCurrentLang()).toBe('en');
      expect(t('appSubtitle')).toBe('My Collections');
      expect(t('loading')).toBe('Loading...');
    });

    it('switches back to Chinese', async () => {
      await setLanguage('en');
      expect(t('cancel')).toBe('Cancel');

      await setLanguage('zh-CN');
      expect(getCurrentLang()).toBe('zh-CN');
      expect(t('cancel')).toBe('取消');
    });

    it('persists language choice to chrome.storage', async () => {
      await setLanguage('en');
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { tabhub_language: 'en' },
        expect.any(Function)
      );
    });
  });

  describe('t() — English', () => {
    beforeEach(async () => {
      await setLanguage('en');
    });

    it('returns English text for known keys', () => {
      expect(t('appSubtitle')).toBe('My Collections');
      expect(t('save')).toBe('Save');
      expect(t('undo')).toBe('Undo');
    });

    it('returns function results with parameters substituted', () => {
      expect(t('selectedCount', 5)).toBe('5 selected');
      expect(t('movedBookmarks', 3)).toBe('Moved 3 bookmark(s)');
    });

    it('handles multi-parameter functions', () => {
      expect(t('autoOrganizeResult', 2, 10)).toBe('Organized: 2 duplicates removed, 10 re-sorted');
      expect(t('chatStats', 100, 8)).toBe('100 bookmarks in 8 collections.');
    });
  });

  describe('t() — missing keys', () => {
    it('returns the key name when key is not in any dictionary', () => {
      expect(t('nonExistentKey')).toBe('nonExistentKey');
      expect(t('totally_bogus_key_xyz')).toBe('totally_bogus_key_xyz');
    });
  });

  describe('getCurrentLang()', () => {
    it('returns zh-CN by default after reset', () => {
      expect(getCurrentLang()).toBe('zh-CN');
    });

    it('returns en after switching', async () => {
      await setLanguage('en');
      expect(getCurrentLang()).toBe('en');
    });
  });

  describe('initLanguage()', () => {
    it('resolves to the current language from storage', async () => {
      chrome.storage.local.get = vi.fn((_keys, cb) => cb({ tabhub_language: 'en' }));
      const lang = await initLanguage();
      expect(lang).toBe('en');
    });

    it('defaults to auto-detection when storage has no value', async () => {
      chrome.storage.local.get = vi.fn((_keys, cb) => cb({}));
      const lang = await initLanguage();
      // In jsdom, navigator.language is typically 'en', so it should resolve to 'en'
      expect(['zh-CN', 'en']).toContain(lang);
    });
  });
});
