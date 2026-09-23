# TabHub

A Chrome extension that replaces your new tab page with a powerful bookmark manager. Inspired by Toby, built on Chrome's native bookmarks API — no backend required, syncs via your Chrome account.

## Features

- **Bookmark management** — Create, edit, move, and delete bookmarks with drag-and-drop reordering
- **Collections** — Organize bookmarks into folders with nested subfolders
- **AI smart categorize** — Suggest collection assignments from URL/title patterns (Claude optional when an API key is set in Settings)
- **Smart search** — Fuzzy matching and category expansion ("social media" finds Twitter, Reddit); Claude can further refine results when configured
- **Dead link detection** — Scan bookmarks for broken URLs with batch checking
- **AI chat assistant** — Natural language helpers (search, find duplicates, move bookmarks); richer with Claude, otherwise rule/mock based
- **Auto-organize** — One-click URL deduplication + alphabetical sort
- **Batch operations** — Multi-select bookmarks for bulk move or delete
- **Save tabs** — Save all open tabs as bookmarks in one click
- **Themes** — System / Light / Dark mode
- **Keyboard shortcuts** — `/` search, `S` save tabs, `O` organize, `M` manage mode

## Tech Stack

- Manifest V3 Chrome Extension
- React 18 + Tailwind CSS 3 + Vite 5
- Chrome Bookmarks API + Storage API
- SortableJS (drag-and-drop)
- lucide-react (icons)
- ESLint 9 + Prettier + Vitest unit & component tests

## Installation

### From source

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd chrome_personal_bookmark
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `dist/` folder

## Development

```bash
npm run dev        # Vite dev server
npm run build      # Production build → dist/
npm run preview    # Preview production build
npm test           # Run tests
npm run test:watch # Tests in watch mode
npm run lint       # ESLint
npm run lint:fix   # ESLint auto-fix
npm run format     # Prettier formatting
```

## AI Features (Optional)

AI features work in two modes:

- **Mock mode** (default) — Pattern-based categorization and helpers using domain/title matching. No API key needed.
- **Claude API mode** — Open the sidebar **Settings** panel, paste your Anthropic API key, and save. With a key, categorize / search / chat can call Claude; without one they stay on local/mock behavior.

Do not treat every "AI" label as fully wired Claude: mock mode is the default until a key is saved in Settings.

## Documentation

- [User Manual](./USER_MANUAL.md) — Complete usage guide for end users
- [CLAUDE.md](./CLAUDE.md) — Developer reference for AI assistants and contributors
- [ENHANCEMENT_PLAN.md](./ENHANCEMENT_PLAN.md) — Historical enhancement notes (superseded; see notice at top of that file)

## Permissions

- `bookmarks` — Read and manage bookmarks
- `tabs` — Access current tab info for "save tabs" feature
- `storage` — Persist theme preference and API key
- `favicon` — Display site favicons for bookmarks

## License

Private project.
