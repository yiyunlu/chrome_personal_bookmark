import '@testing-library/jest-dom';

// Mock Chrome extension APIs
const noop = () => {};

// Chrome APIs pass the callback as the last argument.
// The callback always receives a single result value.
// noopAsync handles variable arg counts by finding the last function arg.
const noopAsync = (...args) => {
  const cb = args.find((a) => typeof a === 'function');
  if (cb) cb();
};

// Creates a dispatching mock function: calling it delegates to fn._impl,
// which can be swapped out by tests. This is necessary because bookmarkService.js
// captures function references at module load time via .bind(), so tests cannot
// replace them by reassigning properties on the chrome object.
function createDispatchable(defaultImpl) {
  const fn = (...args) => fn._impl(...args);
  fn._impl = defaultImpl || noopAsync;
  return fn;
}

const createEventTarget = () => ({
  addListener: noop,
  removeListener: noop,
  hasListener: () => false
});

globalThis.chrome = {
  bookmarks: {
    getTree: createDispatchable(),
    create: createDispatchable(),
    move: createDispatchable(),
    update: createDispatchable(),
    remove: createDispatchable(),
    removeTree: createDispatchable(),
    getSubTree: createDispatchable(),
    onCreated: createEventTarget(),
    onRemoved: createEventTarget(),
    onChanged: createEventTarget(),
    onMoved: createEventTarget(),
    onChildrenReordered: createEventTarget()
  },
  tabs: {
    update: createDispatchable(),
    query: createDispatchable(),
    create: createDispatchable()
  },
  storage: {
    local: {
      get: createDispatchable(),
      set: createDispatchable()
    }
  },
  runtime: {
    lastError: null
  }
};
