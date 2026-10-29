export function storageGet(key) {
  return new Promise((resolve, reject) => {
    // Guard for non-extension contexts (e.g. `npm run dev` in a plain tab).
    const storage = globalThis.chrome?.storage?.local;
    if (!storage) {
      resolve(undefined);
      return;
    }
    storage.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result?.[key]);
    });
  });
}

export function storageSet(key, value) {
  return new Promise((resolve, reject) => {
    const storage = globalThis.chrome?.storage?.local;
    if (!storage) {
      resolve();
      return;
    }
    storage.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

// ── Sync-preferred prefs (theme/view/sort/language/onboarding) ──────────────
// Never use these for secrets (API key) or device-bound state (active source/
// collection): those stay on storageGet/storageSet (chrome.storage.local).
// Local is kept as a mirror, so it is both the fallback when sync is missing or
// failing and the source for the one-shot local→sync migration.

function syncGet(key) {
  return new Promise((resolve, reject) => {
    const storage = globalThis.chrome?.storage?.sync;
    if (!storage) {
      reject(new Error('chrome.storage.sync unavailable'));
      return;
    }
    storage.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result?.[key]);
    });
  });
}

function syncSet(key, value) {
  return new Promise((resolve, reject) => {
    const storage = globalThis.chrome?.storage?.sync;
    if (!storage) {
      reject(new Error('chrome.storage.sync unavailable'));
      return;
    }
    storage.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

export async function prefGet(key) {
  let synced;
  try {
    synced = await syncGet(key);
  } catch {
    return storageGet(key).catch(() => undefined);
  }
  if (synced !== undefined) return synced;
  // Sync is empty: migrate a pre-existing local value once (local is kept).
  const local = await storageGet(key).catch(() => undefined);
  if (local !== undefined) await syncSet(key, local).catch(() => {});
  return local;
}

export async function prefSet(key, value) {
  // Local mirror first so a sync failure never loses the write.
  await storageSet(key, value);
  await syncSet(key, value).catch(() => {});
}
