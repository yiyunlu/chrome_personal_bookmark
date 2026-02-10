# TabHub (Chrome Extension)

A Toby-inspired New Tab extension powered by Chrome native bookmarks.

## Tech Stack
- Manifest V3
- React + Tailwind CSS
- Chrome Bookmarks API + Chrome Storage API

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

## Implemented
- New tab override (`chrome_url_overrides.newtab`)
- Required permissions: `bookmarks`, `tabs`, `storage`, `sessions`
- TabHub root folder auto-create and collection/card mapping
- Bookmark create/remove/move/change listeners for UI refresh
- Sidebar + collection grid UI (Toby-like)
- Save all current tabs into date-named collection
- Drag-and-drop card sorting via SortableJS with `chrome.bookmarks.move`
- Real-time search filtering
