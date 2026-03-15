# TabHub Improvement Plan

## Completed

### Phase 1: Code Architecture (done)
- Split monolithic 1300-line `main.jsx` into 7 components, 3 hooks, 2 utility modules
- Chrome extension compliance fixes (relative asset paths, favicon permission, icons)

### Phase 2: UI Rebuild (done)
- Added `lucide-react` for SVG icons throughout
- Tailwind-first CSS approach (index.css reduced from ~490 to ~85 lines)
- Collapsible sidebar with icon rail, theme toggle buttons, folder icons + count badges
- Prominent search bar, icon+label action buttons, removed QuickEntry
- Two-line bookmark cards (title + domain), hover lift, hover-reveal drag handles
- Modals with fade+scale animations, X close button, folder icons in picker
- Context menu with icons, loading skeletons, empty states, undo slide-in toast

### Phase 3a: Linting & Formatting (done)
- ESLint 9 flat config with react/react-hooks plugins
- Prettier with `.prettierrc` (single quotes, 120 width, no trailing commas)
- `npm run lint` and `npm run format` scripts

### Phase 3b: Testing (done)
- Vitest with jsdom environment, Chrome API mocks
- 72 tests: utils, storage, aiService, searchService, enrichmentService, chatService, AICategorizeModal
- `npm test` and `npm run test:watch` scripts

### Phase 4a + 4b: AI Service + Smart Auto-Categorize (done)
- `src/lib/aiService.js` — mock categorization by domain/title patterns + Claude API integration
- `src/components/AICategorizeModal.jsx` — review modal with accept/reject per suggestion
- "AI 分类" button in Toolbar triggers categorization flow
- Accepted suggestions applied via `moveBookmark()` with undo support

### Phase 4c: Smart Search (done)
- `src/lib/searchService.js` — fuzzy matching + category keyword expansion
- Replaces simple keyword filter in visibleCollections
- Natural language queries like "social media", "dev tools" expand to related keywords
- Falls back to Claude API semantic search when API key is configured

### Phase 4d: Bookmark Enrichment (done)
- `src/lib/enrichmentService.js` — dead link detection, auto-tag generation, domain extraction
- `src/components/DeadLinkModal.jsx` — progress bar, dead link list with delete actions
- "失效检测" button in Toolbar
- Batch link checking (5 concurrent) with progress callback

### Phase 4e: AI Chat Interface (done)
- `src/lib/chatService.js` — NL command parsing (search, move, delete, find duplicates, organize, stats)
- `src/components/ChatPanel.jsx` — floating chat panel with message history
- Chat toggle button (bottom-right FAB)
- Actionable results with confirm buttons for move/delete operations
- Falls back to Claude API for NLU when API key is configured

---

## Potential Future Work

- **Settings panel**: API key management UI, preferences
- **Import/export**: Backup bookmarks as JSON, sync across browsers
- **Keyboard navigation**: Arrow key navigation through bookmarks
- **Bookmark previews**: Thumbnail screenshots of bookmarked pages
- **Collection sharing**: Export collection as shareable link
- **Browser sync**: Cross-browser bookmark sync via cloud storage
