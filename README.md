# TabHub (Chrome Extension)

TabHub is a Toby-inspired New Tab extension built on top of Chrome native bookmarks.
No standalone backend is required; data is read and written directly through `chrome.bookmarks`, and sync is handled by Chrome account sync.

## Tech Stack
- Manifest V3
- React + Tailwind CSS
- Chrome Bookmarks API + Chrome Storage API

## Core Features
- New tab override (`chrome_url_overrides.newtab`)
- Permissions: `bookmarks`, `tabs`, `storage`, `sessions`
- Auto-create and manage `TabHub` root folder
- Bookmark source switcher (default opens Bookmarks Bar)
- Folder list and right-panel collection modules
- Folder sorting (left list and right modules) via `chrome.bookmarks.move`
- Bookmark card click to open in current tab
- Single-bookmark cross-folder drag (handle-based)
- Batch mode: multi-select bookmarks, batch move, batch move-to-trash
- Soft delete via hidden trash folder `.TabHub Trash`
- Undo toast for move / edit / delete / auto-organize operations
- Edit bookmark modal: title, URL, folder move with searchable target list
- Save all current tabs to the currently selected bookmark source
- Auto-organize: deduplicate URLs (move duplicates to trash) + alphabetical sort per folder
- Theme mode: system / light / dark

## Efficiency Entry
- Quick actions bar in UI
- Keyboard shortcuts:
  - `/`: focus search
  - `S`: save current tabs
  - `O`: auto-organize
  - `M`: toggle manage mode

## Compatibility Note
- For Chrome new-tab drag/drop stability, single-bookmark drag currently triggers a hard page reload after drop as a compatibility fallback.

## Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build extension:
   ```bash
   npm run build
   ```
3. Load extension in Chrome:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Click **Load unpacked**
   - Select `/Volumes/Lexar_2T/Canada_DEV/chrome_personal_bookmark/dist`
