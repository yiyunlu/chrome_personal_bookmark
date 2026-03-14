# TabHub Improvement Plan

## Phase 1: Code Architecture (Foundation)

Split the monolithic `src/main.jsx` (~1300 lines) into maintainable components and hooks.

### 1a. Extract React components
- `src/components/Sidebar.jsx` — source switcher, theme selector, collection nav
- `src/components/Toolbar.jsx` — search, save tabs, manage mode, auto-organize buttons
- `src/components/CollectionCard.jsx` — single collection with its bookmark grid
- `src/components/BookmarkCard.jsx` — individual bookmark card with icon, title, actions
- `src/components/BookmarkIcon.jsx` — favicon loader with fallback (already self-contained)
- `src/components/ContextMenu.jsx` — right-click context menu
- `src/components/EditBookmarkModal.jsx` — edit bookmark dialog
- `src/components/BatchMoveModal.jsx` — batch move dialog
- `src/components/UndoToast.jsx` — undo notification

### 1b. Extract custom hooks
- `src/hooks/useTheme.js` — theme detection, persistence, toggling
- `src/hooks/useBookmarks.js` — data fetching, subscription, reload logic
- `src/hooks/useDragAndDrop.js` — SortableJS instance management
- `src/hooks/useUndoStack.js` — undo snapshot + timer logic
- `src/hooks/useKeyboardShortcuts.js` — keyboard event handler

### 1c. Extract utilities
- `src/lib/storage.js` — `storageGet()` / `storageSet()` wrappers
- `src/lib/urlUtils.js` — `normalizeUrlKey()`, `faviconCandidates()`

**Why first:** Everything else (testing, AI features) is much harder to build on a 1300-line single component. This is the highest-leverage change.

---

## Phase 2: Developer Tooling

### 2a. Linting & formatting
- Add ESLint with `eslint-plugin-react` + `eslint-plugin-react-hooks`
- Add Prettier with a `.prettierrc`
- Add `npm run lint` and `npm run format` scripts

### 2b. Testing
- Add Vitest (pairs naturally with Vite)
- Unit tests for `bookmarkService.js` and utility functions (mock Chrome APIs)
- Component tests with React Testing Library for key interactions
- Add `npm run test` script

### 2c. TypeScript (optional, low priority)
- Migrate to `.tsx` for type safety, especially helpful when adding AI service integrations
- Can be done incrementally file-by-file with `allowJs: true`

---

## Phase 3: AI Bookmark Management

### 3a. AI service layer
- `src/lib/aiService.js` — abstraction for AI API calls
- Use Claude API (Anthropic SDK) via a lightweight proxy or direct API key stored in `chrome.storage.local`
- Consider a simple backend (Cloudflare Worker / Vercel Edge Function) to keep API keys server-side

### 3b. Smart auto-categorize
- Analyze bookmark URLs + titles via Claude to suggest collection assignments
- UI: "AI Organize" button that shows proposed moves before applying
- Bulk mode: categorize all unfiled bookmarks at once
- Incremental mode: suggest a collection when a new bookmark is added

### 3c. Smart search
- Natural language search across bookmarks ("that article about React performance I saved last week")
- Semantic matching beyond keyword search using Claude
- Could generate embeddings for bookmarks and do local similarity search, or just send the query + bookmark list to Claude

### 3d. Bookmark enrichment
- Auto-generate descriptions/tags for bookmarks using page titles and URLs
- Detect dead links and suggest removal
- Suggest related bookmarks / "you might also like" from existing collection patterns

### 3e. AI chat interface
- Small chat panel or command palette for natural language bookmark operations
- Examples: "move all React articles to the Frontend collection", "find duplicates", "what did I save about TypeScript?"

---

## Phase 4: Update CLAUDE.md

After each phase, update CLAUDE.md to reflect:
- New directory structure
- New scripts and dev workflow
- AI service configuration
- Testing conventions
- Component patterns and naming conventions

---

## Suggested Priority Order

1. **Phase 1a + 1b** — Component extraction (unblocks everything)
2. **Phase 2a** — Linting (catch issues during refactor)
3. **Phase 3a + 3b** — AI service + auto-categorize (highest-value AI feature)
4. **Phase 2b** — Testing (stabilize before more features)
5. **Phase 3c** — Smart search
6. **Phase 3d + 3e** — Enrichment + chat (polish features)
7. **Phase 1c, 2c** — Utils extraction, TypeScript (nice-to-have)
