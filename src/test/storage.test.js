import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { storageGet, storageSet, prefGet, prefSet } from '../lib/storage';

describe('storage', () => {
  beforeEach(() => {
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({}));
    chrome.storage.local.set = vi.fn((_obj, cb) => cb());
  });

  describe('storageGet', () => {
    it('returns undefined when key not found', async () => {
      const result = await storageGet('missing_key');
      expect(result).toBeUndefined();
    });

    it('returns stored value', async () => {
      chrome.storage.local.get = vi.fn((_keys, cb) => cb({ my_key: 'hello' }));
      const result = await storageGet('my_key');
      expect(result).toBe('hello');
    });

    it('calls chrome.storage.local.get with correct key array', async () => {
      await storageGet('test_key');
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['test_key'], expect.any(Function));
    });
  });

  describe('storageSet', () => {
    it('calls chrome.storage.local.set with correct key-value', async () => {
      await storageSet('my_key', 42);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ my_key: 42 }, expect.any(Function));
    });
  });

  describe('chrome.runtime.lastError handling', () => {
    it('storageGet rejects on a failed read rather than masking it', async () => {
      chrome.storage.local.get = vi.fn((_keys, cb) => {
        chrome.runtime.lastError = { message: 'read failed' };
        cb({});
        chrome.runtime.lastError = null;
      });
      // Callers opt into a default with .catch(() => undefined) at each call site.
      await expect(storageGet('some_key')).rejects.toThrow('read failed');
    });

    it('storageSet rejects on a failed write instead of reporting success', async () => {
      chrome.storage.local.set = vi.fn((_obj, cb) => {
        chrome.runtime.lastError = { message: 'quota exceeded' };
        cb();
        chrome.runtime.lastError = null;
      });
      await expect(storageSet('some_key', 'v')).rejects.toThrow('quota exceeded');
    });
  });

  describe('sync-preferred prefs', () => {
    afterEach(() => {
      delete chrome.storage.sync;
    });

    const mockSync = (data = {}) => {
      chrome.storage.sync = {
        get: vi.fn((keys, cb) =>
          cb(Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]])))
        ),
        set: vi.fn((obj, cb) => {
          Object.assign(data, obj);
          cb();
        })
      };
      return data;
    };

    it('reads the synced value without touching local', async () => {
      mockSync({ pref: 'dark' });
      expect(await prefGet('pref')).toBe('dark');
      expect(chrome.storage.local.get).not.toHaveBeenCalled();
    });

    it('migrates a local-only value to sync once', async () => {
      const data = mockSync();
      chrome.storage.local.get = vi.fn((_k, cb) => cb({ pref: 'list' }));
      expect(await prefGet('pref')).toBe('list');
      expect(data.pref).toBe('list');
      expect(await prefGet('pref')).toBe('list');
      expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
    });

    it('falls back to local when sync is unavailable', async () => {
      chrome.storage.local.get = vi.fn((_k, cb) => cb({ pref: 'en' }));
      expect(await prefGet('pref')).toBe('en');
      await expect(prefSet('pref', 'zh-CN')).resolves.toBeUndefined();
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { pref: 'zh-CN' },
        expect.any(Function)
      );
    });

    it('falls back to local when sync errors', async () => {
      mockSync();
      chrome.storage.sync.get = vi.fn((_k, cb) => {
        chrome.runtime.lastError = { message: 'sync down' };
        cb({});
        chrome.runtime.lastError = null;
      });
      chrome.storage.sync.set = vi.fn((_o, cb) => {
        chrome.runtime.lastError = { message: 'QUOTA_BYTES exceeded' };
        cb();
        chrome.runtime.lastError = null;
      });
      chrome.storage.local.get = vi.fn((_k, cb) => cb({ pref: 'a' }));
      expect(await prefGet('pref')).toBe('a');
      await expect(prefSet('pref', 'b')).resolves.toBeUndefined();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ pref: 'b' }, expect.any(Function));
    });

    it('prefSet writes sync and the local mirror', async () => {
      const data = mockSync();
      await prefSet('pref', 'x');
      expect(data.pref).toBe('x');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ pref: 'x' }, expect.any(Function));
    });

    it('API key stays local-only', async () => {
      const { setApiKey, getApiKey } = await import('../lib/aiService');
      mockSync();
      await setApiKey('sk-secret');
      await getApiKey();
      expect(chrome.storage.sync.set).not.toHaveBeenCalled();
      expect(chrome.storage.sync.get).not.toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { tabhub_ai_api_key: 'sk-secret' },
        expect.any(Function)
      );
    });
  });
});
