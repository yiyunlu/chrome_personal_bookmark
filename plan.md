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

### Phase 4a + 4b: AI Service + Smart Auto-Categorize (done)
- `src/lib/aiService.js` — mock categorization by domain/title patterns + Claude API integration
- `src/components/AICategorizeModal.jsx` — review modal with accept/reject per suggestion
- "AI 分类" button in Toolbar triggers categorization flow
- Accepted suggestions applied via `moveBookmark()` with undo support

---

## Next Steps

#### 3b. Testing
- Add Vitest (pairs naturally with Vite)
- Unit tests for `bookmarkService.js` and utility functions (mock Chrome APIs)
- Component tests with React Testing Library for key interactions
- Add `npm run test` script

### Phase 4: AI Bookmark Management (continued)

#### 4c. Smart search
- Natural language search across bookmarks ("that article about React performance I saved last week")
- Semantic matching beyond keyword search using Claude

#### 4d. Bookmark enrichment
- Auto-generate descriptions/tags for bookmarks using page titles and URLs
- Detect dead links and suggest removal

#### 4e. AI chat interface
- Small chat panel or command palette for natural language bookmark operations
- Examples: "move all React articles to the Frontend collection", "find duplicates"

---

## Priority Order

1. **Phase 3a** — Linting (catch issues, enforce consistency)
2. **Phase 4a + 4b** — AI service + auto-categorize (highest-value AI feature)
3. **Phase 3b** — Testing (stabilize before more features)
4. **Phase 4c** — Smart search
5. **Phase 4d + 4e** — Enrichment + chat (polish features)
