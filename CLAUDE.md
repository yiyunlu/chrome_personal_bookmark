# CLAUDE.md

## Project Overview

**TabHub** is a Manifest V3 Chrome Extension that replaces the new tab page with a bookmark management interface inspired by Toby. It uses Chrome's native bookmarks API for data storage (synced via Chrome account) with no backend required.

## Tech Stack

- **React 18** (JSX, no TypeScript)
- **Vite 5** (build tool & dev server, `base: './'` for extension-compatible relative paths)
- **Tailwind CSS 3** + PostCSS + Autoprefixer
- **lucide-react** (SVG icons, tree-shakeable)
- **SortableJS** (drag-and-drop)
- **Chrome Extensions API** (bookmarks, tabs, storage, favicon)
- **ESLint 9** (flat config) + **Prettier**
- **Vitest** (unit + component testing)

## Project Structure

```
├── index.html                        # HTML entry point
├── vite.config.js                    # Vite config (base: './', output: dist/)
├── tailwind.config.js                # Custom colors, shadow
├── postcss.config.js                 # Tailwind + Autoprefixer
├── public/
│   ├── manifest.json                 # Chrome MV3 manifest (newtab override)
│   ├── background.js                 # Service worker
│   └── icons/                        # Extension icons (16, 48, 128px)
└── src/
    ├── main.jsx                      # App component + root render
    ├── index.css                     # CSS custom properties for theming + component styles
    ├── components/
    │   ├── BatchMoveModal.jsx        # Batch move dialog
    │   ├── BookmarkIcon.jsx          # Favicon loader with fallback
    │   ├── CollectionCard.jsx        # Collection + BookmarkCard components
    │   ├── ContextMenu.jsx           # Right-click context menu
    │   ├── EditBookmarkModal.jsx     # Edit bookmark dialog
    │   ├── Sidebar.jsx               # Source switcher, theme, collection nav
    │   ├── AICategorizeModal.jsx     # AI suggestion review modal
    │   ├── ChatPanel.jsx             # AI chat panel + toggle button
    │   ├── DeadLinkModal.jsx         # Dead link detection results
    │   ├── Toolbar.jsx               # Toolbar + BatchToolbar
    │   └── UndoToast.jsx             # Undo notification
    ├── hooks/
    │   ├── useKeyboardShortcuts.js   # Keyboard event handler
    │   ├── useTheme.js               # Theme detection, persistence, toggling
    │   └── useUndoStack.js           # Undo snapshot + timer logic
    └── lib/
        ├── aiService.js              # AI categorization (mock + Claude API)
        ├── bookmarkService.js        # Chrome Bookmarks API wrapper (promisified)
        ├── chatService.js            # NL command parsing + execution
        ├── enrichmentService.js      # Dead link detection + auto-tagging
        ├── searchService.js          # Smart search with fuzzy + category matching
        ├── storage.js                # chrome.storage.local get/set wrappers
        └── utils.js                  # faviconCandidates, normalizeUrlKey, sortSnapshots
```

## Development Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm test          # Run all tests (vitest run)
npm run test:watch  # Watch mode
```

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

### AI service
`src/lib/aiService.js` provides bookmark categorization. Two modes:
- **Mock mode** (default): Categorizes by domain patterns and title keywords with simulated delay
- **Claude API mode**: Activates when API key is stored (`tabhub_ai_api_key` in chrome.storage.local)

Key exports: `categorizeBookmarks(bookmarks, existingCollections)`, `getApiKey()`, `setApiKey(key)`

Returns `{suggestions: [{bookmarkId, targetCollectionTitle, reason}], newCollections: string[]}`

### Smart search
`src/lib/searchService.js` enhances search with fuzzy matching and category keyword expansion (e.g., "social media" → twitter, reddit). Falls back to Claude API semantic search when API key is set.

### Enrichment service
`src/lib/enrichmentService.js` provides dead link detection (batch HEAD requests with timeout), auto-tag generation from URL/title patterns, and domain extraction.

### Chat service
`src/lib/chatService.js` parses natural language commands (search, move, delete, find duplicates, organize, info/stats) and executes them against bookmark data. Falls back to Claude API for NLU when API key is set.

### Theming
Managed by `useTheme` hook. CSS custom properties (light/dark) in `index.css`, toggled via `data-theme` attribute on `<html>`. Preference persisted to `chrome.storage.local`. Theme toggle uses icon buttons (Sun/Moon/Monitor) in the sidebar.

### Styling approach
Tailwind-first: components use Tailwind utility classes inline. `index.css` contains only CSS custom properties for theming, base resets, scrollbar styles, and keyframe animations. Colors are referenced via `var(--accent)`, `var(--panel-bg)`, etc. for automatic theme support.

### Drag-and-drop
SortableJS instances managed in `useRef(Map)` within `main.jsx`. Three scopes: nav sidebar, module (collection cards), and bookmark cards. After card drops, a hard reload is triggered (`HARD_RELOAD_AFTER_CARD_DROP = true`) as a Chrome compatibility workaround.

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

// main.jsx
HARD_RELOAD_AFTER_CARD_DROP = true
```

## Code Conventions

- **Plain JavaScript** with JSX — no TypeScript
- **Async/await** throughout, with try-catch for error handling
- **DOM data attributes**: `data-collection-id`, `data-card-id`, `data-draggable` for query selection
- **Chinese UI text**: User-facing strings are in Chinese; code identifiers are in English
- **Component pattern**: Presentational components receive props; App owns state
- **Hook pattern**: Reusable stateful logic extracted to `src/hooks/`
- **Icons**: Use `lucide-react` — import individual icons (e.g. `import { Bookmark } from 'lucide-react'`)
- **Styling**: Tailwind utilities inline + CSS custom properties via `style={{ color: 'var(--accent)' }}`
- **URL normalization**: `normalizeUrlKey()` strips protocol/trailing slashes for dedup

## Key Features

- Bookmark CRUD with drag-and-drop reordering (within/between collections)
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

All colors use CSS custom properties for automatic light/dark support:
- `--bg`, `--text`, `--muted` — base colors
- `--panel-bg`, `--panel-border` — card/panel surfaces
- `--card-bg`, `--card-border`, `--hover` — bookmark cards
- `--input-bg`, `--input-border` — form controls
- `--accent`, `--accent-soft` — primary blue accent
- `--danger`, `--danger-soft` — destructive action red
- `--shadow` — elevation shadow
