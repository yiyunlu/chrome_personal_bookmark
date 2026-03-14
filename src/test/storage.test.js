import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storageGet, storageSet } from '../lib/storage';

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
});
