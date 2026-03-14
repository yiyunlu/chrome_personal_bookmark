# UI Improvement Plan

## Current UI Assessment

The current UI is functional but has significant polish gaps for a new tab page (seen 50+ times/day):

**Visual issues:**
- Unicode characters for icons (⋮⋮, ▸, ▾) — no proper SVG icons anywhere
- No transitions or animations — everything appears/disappears instantly
- Raw `<select>` dropdowns for source/theme look dated
- Flat design with minimal visual hierarchy
- "Loading..." text instead of skeleton/shimmer
- "暂无可显示书签" with no illustration for empty state
- Buttons and search crammed on one toolbar row
- Bookmark cards show only icon + title — no URL/domain hint
- QuickEntry chips duplicate toolbar buttons (wasted space)
- No sidebar collapse — fixed 17rem always visible
- Context menu has no icons, just text buttons
- No focus rings or keyboard navigation indicators

**Structural issues:**
- ~490 lines of custom CSS in `index.css` duplicating what Tailwind can do
- Mix of custom CSS classes and Tailwind utilities — inconsistent approach
- No shared component primitives (every button/input is hand-styled)

---

## Approach: Rebuild with Tailwind-first + lucide-react icons

**Why not a full component library (shadcn, Radix)?**
This is a Chrome extension — bundle size matters. lucide-react (tree-shaken SVG icons, ~200B per icon) + Tailwind utilities give us a modern look with no additional runtime.

**New dependency:** `lucide-react` for icons (~200 bytes per icon, tree-shakeable)

---

## Plan

### Step 1: Add lucide-react, clean up CSS

- `npm install lucide-react`
- Migrate `index.css` from custom classes → Tailwind utilities + CSS variables (keep only theme variables and a few layout rules that can't be expressed in Tailwind)
- Establish shared Tailwind component classes via `@apply` for: buttons (primary, secondary, ghost), inputs, cards, modals

### Step 2: Redesign Sidebar

**Current:** Plain text logo, raw `<select>` dropdowns, flat nav list with ⋮⋮ handles

**New design:**
- Collapsible sidebar (toggle button, collapsed = icon-only rail ~3.5rem)
- Logo with a small bookmark SVG icon + "TabHub" text
- Source switcher: styled dropdown with folder icons per source
- Theme toggle: 3 icon buttons (sun/moon/monitor) instead of `<select>`
- Collection nav: folder icons, item counts as badges, proper drag handle icon (GripVertical)
- Active state: left accent border + background highlight instead of full background fill
- Scrollable nav with subtle fade at top/bottom edges
- "Add collection" button at bottom of nav

### Step 3: Redesign Toolbar & Search

**Current:** One row with save button + manage toggle + auto-organize + search input + quick entry chips

**New design:**
- Search bar prominently at the top (full width, with Search icon, `Cmd+/` hint)
- Action buttons row below: icon+label buttons with tooltips showing keyboard shortcuts
  - Save tabs (Download icon)
  - Auto-organize (Sparkles icon)
  - Manage mode (CheckSquare icon) — toggle style with active state
- Remove QuickEntry component entirely — shortcuts shown as button tooltips
- Batch toolbar: pill-shaped count badge + icon buttons

### Step 4: Redesign Collection Cards

**Current:** White card, text header with ⋮⋮, grid of bookmark cards

**New design:**
- Collection header: FolderOpen icon + title + count badge + chevron toggle
- Drag handle: GripVertical icon (only visible on hover)
- Collapse animation: smooth height transition
- Empty collection: subtle dashed border placeholder with "Drop bookmarks here"
- Cards grid: slightly larger min-width (260px), better gap

### Step 5: Redesign Bookmark Cards

**Current:** icon + title in a flat bordered card

**New design:**
- Two-line layout: title (bold) + domain/path below in muted text (e.g. "github.com/user/repo")
- Favicon larger (24px instead of 20px) with subtle background circle
- Hover: slight translateY(-1px) + shadow increase
- Manage mode: checkbox with smooth transition, action buttons slide in from right
- Drag handle: GripVertical icon, visible only on hover (not permanently)
- Selected state: blue left border accent + subtle background

### Step 6: Redesign Modals

**Current:** Plain backdrop, instant show/hide, basic form layout

**New design:**
- Backdrop with fade-in transition
- Modal with scale+fade entrance animation
- Form inputs with floating labels or stacked labels with proper spacing
- Folder picker: folder icons, selected item with checkmark icon
- Close button (X icon) in header corner
- Escape key to close (already works via backdrop click)

### Step 7: Redesign Context Menu

**Current:** Plain text buttons

**New design:**
- Items with icons: Pencil (edit), Trash2 (delete), FolderInput (rename)
- Keyboard shortcut hints on the right side
- Subtle separator between action groups
- Appear with quick fade+scale animation from click point

### Step 8: Polish & Micro-interactions

- Loading skeleton: shimmer placeholders for sidebar nav + collection cards
- Empty state: illustration (simple SVG) + "No bookmarks yet" + CTA button
- Undo toast: slide-in from bottom-right with progress bar showing 8s countdown
- Smooth scroll to collection when clicking sidebar nav
- Button hover/active states with subtle scale
- Focus-visible rings for keyboard accessibility
- Transition on theme switch (brief color fade)

### Step 9: Responsive & Dark Mode Polish

- Sidebar auto-collapses on narrow windows (<1024px)
- Dark mode: ensure all new components look good — test icon contrast, card shadows, hover states
- Ensure the gradient background works well in both themes

---

## Files Affected

| File | Change |
|------|--------|
| `package.json` | Add `lucide-react` |
| `tailwind.config.js` | Extended theme (transition timing, spacing tokens) |
| `src/index.css` | Drastically reduced — only CSS variables + few base rules |
| `src/components/Sidebar.jsx` | Rebuilt with icons, collapsible, theme toggle |
| `src/components/Toolbar.jsx` | Rebuilt search + icon buttons, remove QuickEntry |
| `src/components/CollectionCard.jsx` | Icons, hover handles, collapse animation |
| `src/components/BookmarkIcon.jsx` | Larger favicon with circle background |
| `src/components/ContextMenu.jsx` | Icons, keyboard hints, animation |
| `src/components/EditBookmarkModal.jsx` | Transitions, close button, better layout |
| `src/components/BatchMoveModal.jsx` | Same modal treatment |
| `src/components/UndoToast.jsx` | Slide animation, countdown bar |
| `src/main.jsx` | Wire up sidebar collapse state, remove QuickEntry usage |

---

## Execution Order

Steps 1-5 are the high-impact core. Steps 6-9 are polish that can be done incrementally.

Estimated: Steps 1-5 are a full rebuild of the visual layer. Steps 6-9 are incremental improvements.
