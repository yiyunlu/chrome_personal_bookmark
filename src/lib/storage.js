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
