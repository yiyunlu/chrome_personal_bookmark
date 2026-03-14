# CLAUDE.md

## Project Overview

**TabHub** is a Manifest V3 Chrome Extension that replaces the new tab page with a bookmark management interface inspired by Toby. It uses Chrome's native bookmarks API for data storage (synced via Chrome account) with no backend required.

## Tech Stack

- **React 18** (JSX, no TypeScript)
- **Vite 5** (build tool & dev server)
- **Tailwind CSS 3** + PostCSS + Autoprefixer
- **SortableJS** (drag-and-drop)
- **Chrome Extensions API** (bookmarks, tabs, storage, sessions)
- No testing framework, linter, or formatter configured

## Project Structure

```
├── index.html                    # HTML entry point
├── vite.config.js                # Vite config (output: dist/, no sourcemaps)
├── tailwind.config.js            # Custom colors (tabhub-bg, tabhub-sidebar), shadow
├── postcss.config.js             # Tailwind + Autoprefixer
├── public/
│   ├── manifest.json             # Chrome MV3 manifest (newtab override)
│   └── background.js             # Service worker (empty placeholder)
└── src/
    ├── main.jsx                  # Entire React app (~1300 lines, single App component)
    ├── index.css                 # CSS custom properties for theming + component styles
    └── lib/
        └── bookmarkService.js    # Chrome Bookmarks API wrapper (promisified)
```

## Development Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

To load in Chrome: build, then go to `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

## Architecture & Key Patterns

### Single-component architecture
All UI lives in `src/main.jsx` as a single `App` component using React hooks (`useState`, `useEffect`, `useMemo`, `useRef`). There is no state management library — all state is local React state.

### Service layer
`src/lib/bookmarkService.js` wraps Chrome Bookmarks API with `promisifyChromeApi()` helper. Key functions:
- `ensureTabHubRootFolder()` / `ensureTrashFolder()` — create root data folders
- `getCollectionsPayload()` — fetch all bookmarks hierarchically
- `subscribeBookmarksChanges()` — real-time sync listener
- `saveCurrentWindowTabsToCollection()` — bulk save tabs
- CRUD: `moveBookmark()`, `updateBookmark()`, `renameCollectionFolder()`

### Theming
CSS custom properties (light/dark) in `index.css`, toggled via `data-theme` attribute. Theme preference persisted to `chrome.storage.local` with key `tabhub_theme_mode`.

### Drag-and-drop
SortableJS instances managed in a `useRef(Map)`. After card drops, a hard reload is triggered (`HARD_RELOAD_AFTER_CARD_DROP = true`) as a Chrome compatibility workaround.

### Data model
- **Sources** = top-level bookmark folders under the TabHub root
- **Collections** = subfolders within a source (can be nested)
- **Cards** = individual bookmarks with `{id, title, url, parentId, index}`
- **Trash** = special folder `.TabHub Trash` for soft deletes

### Constants
```js
TABHUB_ROOT_NAME = 'TabHub'
TRASH_FOLDER_NAME = '.TabHub Trash'
THEME_STORAGE_KEY = 'tabhub_theme_mode'
```

## Code Conventions

- **Plain JavaScript** with JSX — no TypeScript
- **Async/await** throughout, with try-catch for error handling
- **CSS**: Mix of Tailwind utility classes and custom CSS classes in `index.css`
- **DOM data attributes**: `data-collection-id`, `data-card-id`, `data-draggable` for query selection
- **Chinese UI text**: User-facing strings are in Chinese; code identifiers are in English
- **No component splitting**: All rendering logic is inline in the App component
- **URL normalization**: `normalizeUrlKey()` strips protocol/trailing slashes for dedup

## Key Features

- Bookmark CRUD with drag-and-drop reordering (within/between collections)
- Auto-organize: URL deduplication + alphabetical sort
- Manage mode: batch select, move, delete
- Soft delete to trash folder with undo (8-second toast)
- Keyboard shortcuts: `/` (search), `S` (save tabs), `O` (organize), `M` (manage)
- Real-time bookmark sync across tabs via Chrome API subscription
- Search filtering across titles and URLs
