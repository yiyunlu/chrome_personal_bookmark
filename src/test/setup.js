import '@testing-library/jest-dom';

// Mock Chrome extension APIs
const noop = () => {};
const noopAsync = (_args, cb) => cb && cb();

const createEventTarget = () => ({
  addListener: noop,
  removeListener: noop,
  hasListener: () => false
});

globalThis.chrome = {
  bookmarks: {
    getTree: noopAsync,
    create: noopAsync,
    move: noopAsync,
    update: noopAsync,
    remove: noopAsync,
    removeTree: noopAsync,
    getSubTree: noopAsync,
    onCreated: createEventTarget(),
    onRemoved: createEventTarget(),
    onChanged: createEventTarget(),
    onMoved: createEventTarget(),
    onChildrenReordered: createEventTarget()
  },
  tabs: {
    update: noopAsync,
    query: noopAsync
  },
  storage: {
    local: {
      get: noopAsync,
      set: noopAsync
    }
  },
  runtime: {
    lastError: null
  }
};
