import '@testing-library/jest-dom';

// Mock Chrome extension APIs.
// Chrome async APIs take a trailing callback after a variable number of
// arguments (e.g. bookmarks.getTree(cb) vs bookmarks.move(id, dest, cb)),
// so the stub must find the callback rather than assume a fixed arity.
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
    getChildren: createDispatchable(),
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

// ── jsdom gaps Radix relies on ───────────────────────────────────────────────
// Radix's Popper measures its anchor with ResizeObserver and scrolls the active
// menu/select item into view. jsdom implements neither. Lives here rather than
// per test file because Dialog (P1), ContextMenu (P2), Select (P3) and
// Tooltip/Sonner (P4) all need it.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
