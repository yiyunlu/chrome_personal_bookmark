# CLAUDE.md

## Project Overview

**TabHub** is a Manifest V3 Chrome Extension that replaces the new tab page with a bookmark management interface inspired by Toby. It uses Chrome's native bookmarks API for data storage (synced via Chrome account) with no backend required.

## Tech Stack

- **React 18** (JSX, no TypeScript)
- **Vite 5** (build tool & dev server, `base: './'` for extension-compatible relative paths)
- **Tailwind CSS 3** + PostCSS + Autoprefixer
- **shadcn/ui** (vendored primitives in `src/components/ui/`, on Radix) — see `SHADCN_MIGRATION.md`
- **lucide-react** (SVG icons, tree-shakeable)
- **SortableJS** (drag-and-drop)
- **Chrome Extensions API** (bookmarks, tabs, storage, favicon)
- **ESLint 9** (flat config) + **Prettier**
- **Vitest** (unit + component testing)

## Project Structure

```
├── index.html                        # HTML entry point
├── components.json                   # shadcn CLI config — hand-written; NEVER run `shadcn init` (see SHADCN_MIGRATION.md)
├── SHADCN_MIGRATION.md               # Style contract, token layer, tailwind-merge hazards, phase history
├── scripts/verify-ui.sh              # 12-gate acceptance script; must exit 0 before any UI commit
├── jsconfig.json                     # JS project config (`@` -> ./src alias, compiler options)
├── vite.config.js                    # Vite config (base: './', output: dist/)
├── tailwind.config.js                # Custom colors, shadow
├── postcss.config.js                 # Tailwind + Autoprefixer
├── public/
│   ├── manifest.json                 # Chrome MV3 manifest (newtab override)
│   ├── background.js                 # Service worker
│   └── icons/                        # Extension icons (16, 48, 128px)
└── src/
    ├── main.jsx                      # App component + root render (owns all state)
    ├── index.css                     # `--ui-*` design tokens (light/dark), fonts, base layer, keyframes
    ├── fonts/                        # IBM Plex Sans/Mono woff2, bundled (never a Google Fonts <link>)
    ├── components/
    │   ├── ui/                       # shadcn primitives, VENDORED — never edit; compose and wrap
    │   ├── DialogShell.jsx           # The one dialog shell (Dialog + AlertDialog) every modal renders through
    │   ├── AICategorizeModal.jsx     # AI suggestion review modal
    │   ├── BatchMoveModal.jsx        # Batch move dialog
    │   ├── BookmarkIcon.jsx          # Favicon, or a deterministic identity tile when Chrome has none
    │   ├── ChatPanel.jsx             # AI chat panel + toggle button
    │   ├── CollectionCard.jsx        # Collection (sticky header, grid or list view) + BookmarkCard
    │   ├── ConfirmModal.jsx          # Confirmation (AlertDialog: no backdrop dismiss, autofocus Cancel)
    │   ├── ContextMenu.jsx           # Right-click menu (DropdownMenu on a virtual anchor)
    │   ├── DeadLinkModal.jsx         # Dead link detection results
    │   ├── EditBookmarkModal.jsx     # Edit bookmark dialog
    │   ├── PromptModal.jsx           # Prompt input dialog
    │   ├── SettingsModal.jsx         # Settings dialog (API key, preferences)
    │   ├── Sidebar.jsx               # Rail: source Select, all-collections, 分类 nav, bottom bar (theme/settings)
    │   ├── Toolbar.jsx               # Search + view toggle + 管理 row, then actions row; BatchToolbar
    │   ├── UndoToast.jsx             # Sonner toaster (takes `theme` as a prop; no next-themes)
    │   └── WelcomeCard.jsx           # Onboarding card
    ├── hooks/
    │   ├── useKeyboardShortcuts.js   # Keyboard event handler (shortcuts + Escape)
    │   ├── useTheme.js               # Theme detection, persistence, toggling
    │   └── useUndoStack.js           # Undo snapshot + timer logic
    ├── lib/
    │   ├── aiService.js              # AI categorization (mock + Claude API)
    │   ├── bookmarkService.js        # Chrome Bookmarks API wrapper (promisified)
    │   ├── chatService.js            # NL command parsing + execution
    │   ├── claudeClient.js           # Claude API HTTP client
    │   ├── cn.js                     # `cn()` = clsx + tailwind-merge, extended with the project's custom scales
    │   ├── enrichmentService.js      # Dead link detection + auto-tagging
    │   ├── faviconProbe.js           # Tells a real favicon from Chrome's default globe (byte comparison)
    │   ├── identity.js               # Deterministic letter + tint tile for bookmarks and folders
    │   ├── i18n.js                   # Internationalization (zh-CN, en) + language detection
    │   ├── searchService.js          # Smart search with fuzzy + category matching
    │   ├── storage.js                # chrome.storage.local get/set wrappers
    │   ├── taxonomy.js               # Category taxonomy for AI categorization
    │   ├── types.js                  # Shared type definitions / constants
    │   └── utils.js                  # faviconCandidates, normalizeUrlKey, sortSnapshots
    └── test/                         # Vitest suites + Chrome API mock (setup.js)
```

## Development Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm test          # Run all tests (vitest run)
npm run test:watch  # Watch mode
./scripts/verify-ui.sh   # 12 acceptance gates (tests, lint, build, token layer, SortableJS DOM invariants, style ratchet)
```

`./scripts/verify-ui.sh` must exit 0 before any UI change is committed. Gate 12 is a
**ratchet**: inline `var()` colours, raw `<button>`s, off-scale radii and off-scale icon
sizes are all at **0** and the ceilings may only go down. Its greps see comments, so do not
quote those literals in a comment.

To load in Chrome: build, then go to `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

## Architecture & Key Patterns

### Component architecture
The `App` component in `src/main.jsx` owns all state and business logic. Presentational components in `src/components/` receive props and callbacks. Custom hooks in `src/hooks/` encapsulate reusable stateful logic (theme, undo, keyboard shortcuts).

### Service layer
`src/lib/bookmarkService.js` wraps Chrome Bookmarks API with `promisifyChromeApi()` helper. Key functions:
- `ensureTabHubRootFolder()` / `ensureTrashFolder()` — create root data folders
- `getCollectionsPayload()` — fetch all bookmarks hierarchically
- `subscribeBookmarksChanges()` — real-time sync listener
- `saveCurrentWindowTabsToCollection()` — bulk save tabs
- CRUD: `moveBookmark()`, `updateBookmark()`, `renameCollectionFolder()`
- `moveBookmarkToCardPosition()` — translates a card-relative position (SortableJS drop index among rendered cards) into the real chrome child index (which also counts subfolders); null/past-end appends. Use this for any card move driven by UI position.

### AI service
`src/lib/aiService.js` provides bookmark categorization. Two modes:
- **Mock mode** (default): Categorizes by domain patterns and title keywords with simulated delay
- **Claude API mode**: Activates when API key is stored (`tabhub_ai_api_key` in chrome.storage.local)

Key exports: `categorizeBookmarks(bookmarks, existingCollections)`, `getApiKey()`, `setApiKey(key)`

Returns `{suggestions: [{bookmarkId, targetCollectionTitle, reason}], newCollections: string[]}`

### Smart search
`src/lib/searchService.js` enhances search with fuzzy matching and category keyword expansion (e.g., "social media" → twitter, reddit). A Claude-powered `semanticSearch()` exists but is not wired into the UI — `main.jsx` only calls the local `smartSearch()`.

### Enrichment service
`src/lib/enrichmentService.js` provides dead link detection (batch HEAD requests with timeout), auto-tag generation from URL/title patterns, and domain extraction.

### Chat service
`src/lib/chatService.js` parses natural language commands (search, move, delete, find duplicates, organize, info/stats) and executes them against bookmark data. Falls back to Claude API for NLU when API key is set.

### Theming
Managed by `useTheme` hook. The palette is the `--ui-*` token set in `index.css` (light on `:root`, dark on `:root[data-theme='dark']`), toggled via the `data-theme` attribute on `<html>` — Tailwind's `darkMode` keys off that attribute, not a `.dark` class. Preference persisted to `chrome.storage.local`. The theme control is an icon-only segmented control (system / light / dark) in the sidebar's bottom bar. Visuals follow the Claude Design file `TabHub.dc.html` (warm neutral, blue accent, IBM Plex, 13px base); behaviour follows the existing app — `SHADCN_MIGRATION.md` records the split.

### Styling approach
**Token classes only.** Every colour is a Tailwind class mapped to a `--ui-*` token in `tailwind.config.js` (`bg-card`, `text-muted-foreground`, `text-faint`, `border-border`, `bg-primary/10`, `shadow-panel`, `bg-scrim/40` …). There is **no** legacy `--accent` / `--panel-bg` alias layer any more and **no** inline `style={{ color: 'var(--…)' }}` — gate 12 counts both at 0. Compose vendored `src/components/ui/*` primitives; never edit them. Class merging goes through `cn()` from `src/lib/cn.js`, and tailwind-merge has five documented ways to silently drop a class you meant to keep (a later `text-*` deletes `leading-*`; an arbitrary value loses to a named one; custom utilities only merge because `cn.js` registers them; a responsive prefix is its own group; a `hover:` variant is its own group) — **resolve the merged string through `cn()` before believing an override works**. The full contract (colour table, radius scale, control-relative icon sizes, Button variants, typography) is the "Style contract" section of `SHADCN_MIGRATION.md`.

### Drag-and-drop
SortableJS instances managed in `useRef(Map)` within `main.jsx`. Three scopes: nav sidebar, module (collection cards), and bookmark cards. After a card drop, the handler reverts SortableJS's DOM mutation before React reconciles (otherwise React's virtual DOM desyncs → removeChild crash), then persists the move via `moveBookmarkToCardPosition()` and refreshes state. There is no hard reload.

### Data model
- **Sources** = top-level bookmark folders under the TabHub root
- **Collections** = subfolders within a source (can be nested)
- **Cards** = individual bookmarks with `{id, title, url, parentId, index}`
- **Trash** = special folder `.TabHub Trash` for soft deletes

### Constants
```js
// bookmarkService.js
TABHUB_ROOT_NAME = 'TabHub'
TRASH_FOLDER_NAME = '.TabHub Trash'
```

## Code Conventions

- **Plain JavaScript** with JSX — no TypeScript
- **Async/await** throughout, with try-catch for error handling
- **DOM data attributes**: `data-collection-id`, `data-card-id`, `data-draggable` for query selection
- **i18n UI text**: User-facing strings go through `t()` from `src/lib/i18n.js` (zh-CN default, en supported); code identifiers are in English
- **Component pattern**: Presentational components receive props; App owns state
- **Hook pattern**: Reusable stateful logic extracted to `src/hooks/`
- **Icons**: Use `lucide-react` — import individual icons (e.g. `import { Bookmark } from 'lucide-react'`)
- **Styling**: Tailwind token classes only, merged with `cn()`; no inline colour styles, no raw `<button>` (use `<Button>`), no stock Tailwind palette colours — see the Style contract in `SHADCN_MIGRATION.md`
- **URL normalization**: `normalizeUrlKey()` strips protocol/trailing slashes for dedup

## Key Features

- Bookmark CRUD with drag-and-drop reordering (within/between collections), in **grid or list view** (toggle in the toolbar, persisted); tags render in list view only
- Sticky collection headers; bookmarks without a favicon get a deterministic letter + tint identity tile (same scheme marks folders in the collapsed sidebar)
- AI smart categorize: analyzes bookmarks and suggests collection moves (mock + Claude API)
- Smart search: fuzzy matching + category expansion + optional Claude semantic search
- Dead link detection: batch URL checking with progress indicator
- AI chat assistant: natural language commands (search, move, delete, find duplicates, stats)
- Auto-organize: URL deduplication + alphabetical sort
- Manage mode: batch select, move, delete
- Soft delete to trash folder with undo (8-second toast)
- Keyboard shortcuts: `/` (search), `S` (save tabs), `O` (organize), `M` (manage)
- Real-time bookmark sync across tabs via Chrome API subscription
- Search filtering across titles and URLs
- Collapsible sidebar with icon-only rail mode
- Loading skeletons, empty state illustrations, entrance animations

## CSS Theme Variables

The palette is the `--ui-*` token set in `src/index.css`, stored as HSL triplets so `tailwind.config.js` can consume them as `hsl(var(--ui-x))` (which is what makes `/10`-style alpha modifiers work). Components never reference them directly — only through the Tailwind classes mapped in `tailwind.config.js`:
- `--ui-background` / `--ui-foreground` — page and text; `--ui-faint` is the design's third text level (counts, URLs)
- `--ui-card` / `--ui-popover` / `--ui-sidebar` — surfaces; `--ui-border` / `--ui-input` — hairlines
- `--ui-primary` — the blue accent (`--ui-ring` is pinned to it, so swapping the accent is two lines)
- `--ui-secondary` / `--ui-muted` / `--ui-accent` — hover and secondary surfaces (shadcn's meaning of "accent")
- `--ui-destructive`, `--ui-warning`, `--ui-scrim` — semantic; `--shadow` — the one non-`--ui-*` var, read by `shadow-panel`

Radius is anchored on the design's values in `tailwind.config.js` (sm 6 / md 8 / lg 9 / xl 9) so every primitive lands where the design puts it with no per-call-site override.
