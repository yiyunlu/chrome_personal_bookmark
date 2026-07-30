# TabHub — Enhancement Plan

_Generated from a multi-angle review (correctness, architecture/tech-debt, product/UX) of HEAD on `claude/add-claude-documentation-QRFUx`._

This plan is organized as a phased roadmap. Each item carries **effort** (S ≤ 0.5d, M = 1–2d, L = 3d+) and a concrete first step with `file:line` anchors. Phases are ordered so that earlier work de-risks and unblocks later work.

---

## Phase 0 — Stabilize: fix confirmed correctness bugs

These are verified defects in current code. Do these before building new features on top.

### P0-1 · Drag-and-drop uses DOM index as the Chrome bookmark index — **HIGH**
`src/main.jsx:392,424,427` — `evt.oldIndex`/`newIndex` are positions in the *rendered* card list (URL-only, subfolders filtered out by `normalizeCollection` at `bookmarkService.js:38`). They are passed straight to `chrome.bookmarks.move`, whose index is the absolute position among **all** children (including subfolders and the hidden `.TabHub Trash`). Whenever a collection folder also contains subfolders, both placement and the undo restore land in the wrong slot.
- **Fix:** translate DOM index → Chrome index using the neighbor card's real `index` (look up `collection.cards[newIndex].index` / `cardById`), or compute insert position from the adjacent bookmark's Chrome `index`.
- **Effort:** M. Also fixes P0-6 (same root cause).

### P0-2 · Trash folder id not persisted → duplicate `.TabHub Trash` folders — **MED-HIGH**
`src/main.jsx:498,550` — when `trashFolderId` is empty, `moveCardsToTrash`/`handleAutoOrganize` resolve the folder via `ensureTrashFolder` but never `setTrashFolderId`. Two delete actions firing before `refresh()` completes both see an empty id and both create a trash folder (`ensureTrashFolder` has no locking, `bookmarkService.js:248`).
- **Fix:** memoize trash resolution behind a ref-held promise (`ensureTrashFolderOnce`) and call `setTrashFolderId(folder.id)` after resolving.
- **Effort:** S.

### P0-3 · Trash created inside the active source, not the TabHub root — **MED-HIGH**
`src/main.jsx:495,545` — `rootId = activeSourceId || tabHubRootId`. When the active source isn't the TabHub root (default load selects the Bookmarks Bar, `bookmarkService.js:161`), deletes/auto-organize create a stray `.TabHub Trash` inside that foreign root.
- **Fix:** always trash to a single canonical folder under `tabHubRootId`, independent of active source.
- **Effort:** S.

### P0-4 · Chat Claude-path discards computed result message — **MED**
`src/lib/chatService.js:285` — `{ ...result, message: parsed.message || result.message }`. Because Claude is prompted to always emit `message`, the count-bearing `executeCommand` message ("找到 12 个匹配的书签") is always overwritten, so the prose and the rendered result count can contradict.
- **Fix:** only use `parsed.message` for `type === 'response'`; otherwise prefer `result.message` (or append).
- **Effort:** S.

### P0-5 · `expandCategoryQuery` over-expands short queries — **MED**
`src/lib/searchService.js:68` — `keywords.some(kw => kw.includes(q) || q.includes(kw))` makes a 1–2 char query like `"a"` match nearly every keyword in every category, so almost everything scores a 0.6 "语义匹配".
- **Fix:** require query length ≥ 3 before category expansion; match whole category names/keywords rather than bidirectional substring.
- **Effort:** S.

### P0-6 · `moveCardsWithUndo` insert index wrong with subfolders — **MED**
`src/main.jsx:473` — `insertIndex = targetCollection.cards.length` counts rendered cards only; when the target folder has subfolders the first moved card lands among existing items. Same root cause as P0-1.
- **Fix:** compute insert index from the last child's real Chrome `index + 1`.
- **Effort:** S (fold into P0-1).

### P0-7 · Chat Claude-path missing param guards — **MED**
`src/lib/chatService.js:108,131` — `command.params.bookmarkQuery.toLowerCase()` throws if Claude returns a command type without the expected params; the throw is swallowed by the `catch` at `:286`, silently falling back to a raw-text search.
- **Fix:** guard each case (`const q = (command.params?.bookmarkQuery || '').toLowerCase(); if (!q) return {message: t(...)}`).
- **Effort:** S.

### P0-8 · `onConfirm` closures capture stale `allCards` — **MED**
`src/main.jsx:770,783` — the chat confirm closures resolve cards from the `allCards` captured at message time. If bookmarks change before the user clicks confirm, removed cards are silently `.filter(Boolean)`-dropped and undo snapshots may be stale.
- **Fix:** resolve cards from a fresh ref/`cardById` at confirm time and notify when some results no longer exist.
- **Effort:** S.

### P0-9 · Keyboard shortcuts fire with Ctrl/Cmd/Alt held — **LOW-MED**
`src/hooks/useKeyboardShortcuts.js:13` — no modifier check, so Ctrl/Cmd+S, +O, +M trigger app actions and `preventDefault()` the browser's.
- **Fix:** `if (event.metaKey || event.ctrlKey || event.altKey) return;` before the letter checks.
- **Effort:** S.

### P0-10 · `showUndo`/`handleUndo` not memoized — **LOW**
`src/hooks/useUndoStack.js:17` — new identity each render; `showUndo` is in the card-sortable effect deps (`main.jsx:458`), so Sortable instances are torn down/rebuilt on unrelated re-renders.
- **Fix:** wrap both in `useCallback`.
- **Effort:** S.

### P0-11 · Dead-link detection: distinguish "unknown" from "dead" — **MED** _(refinement)_
The `no-cors` bug is already fixed (removed `mode:'no-cors'` + added `host_permissions:["<all_urls>"]`, so the extension reads real status codes). Remaining gap: servers that reject `HEAD` or fail at the network layer are reported as dead (false positives that prompt deleting good bookmarks).
- **Fix:** treat network/HEAD failures as "unverifiable" (a third state) rather than "dead"; optionally retry with `GET`. Surface "couldn't verify" distinctly in `DeadLinkModal`.
- **Effort:** M.

---

## Phase 1 — Foundation hardening (tech debt that unblocks the rest)

### P1-1 · Add CI — **S**
No `.github/workflows/` exists, yet 72 tests + lint + build all pass locally. Add `ci.yml` running `npm ci && npm run lint && npm test && npm run build` on PR. (A `session-start-hook` skill is available to keep web sessions runnable too.)

### P1-2 · Delete dead code — **S**
- `src/components/BookmarkCard.jsx` — orphaned duplicate; the live one is the named export in `CollectionCard.jsx:6` (the two have diverged: `selected` vs `isSelected`).
- `semanticSearch` (`searchService.js:150`, ~65 lines) — exported, never imported.
- Unused exports: `removeBookmark` (`bookmarkService.js:236`), `getCurrentLang` (`i18n.js:284`).
- `enrichBookmarks`/`generateTags`/`extractDomain` are only referenced by their own tests — either wire up auto-tagging (see P3-3) or remove.

### P1-3 · Consolidate Claude API integration → `src/lib/claudeClient.js` — **S-M**
The identical `fetch('https://api.anthropic.com/v1/messages')` block (headers, `anthropic-version`, model id, `data.content?.[0]?.text`, brittle `text.match(/\{[\s\S]*\}/)` JSON scrape) is duplicated in `aiService.js:78`, `searchService.js:172`, `chatService.js:247`. Extract `callClaude({prompt, maxTokens})` + `extractJson(text)`; centralize the model id and version. (Model `claude-sonnet-4-20250514` is valid; consider bumping to a newer Sonnet here once centralized.)

### P1-4 · Consolidate taxonomy → `src/lib/taxonomy.js` — **M**
Domain→category knowledge is encoded three times in three shapes that have already drifted: `aiService.js:119` (`domainCategories`), `searchService.js:15` (`CATEGORY_KEYWORDS`, inverted), `enrichmentService.js:81` (`TAG_RULES`, regex + Chinese tags). Define one canonical `DOMAIN_TAXONOMY` and derive the three shapes via adapters.

### P1-5 · Error-handling consistency — **M**
Services use bare `catch {}` that fall back silently (`searchService.js:211`, `chatService.js:286`) — an API failure is indistinguishable from "no key." Multi-`await` mutation loops (`handleAutoOrganize`, `moveCardsWithUndo`) have `try/finally` but no `catch`, leaving half-moved state on failure. Add a `logError(context, err)` util (warn-level, allowed by lint) and wrap mutation loops in `catch` that toasts + `refresh()`.

### P1-6 · Enable JSDoc type-checking — **S**
Services are already richly JSDoc-typed but unchecked, which let the `selected`/`isSelected` and taxonomy drift slip through. Add `jsconfig.json` with `checkJs:true` and a `types.js` defining `Card`/`Collection`/`Source`/`AISuggestion`. (Full TS migration is L — defer until after Phase 5.)

---

## Phase 2 — Unblock the core curate-and-organize loop (highest user impact)

### P2-1 · Create collections + add a bookmark manually — **M**
Biggest table-stakes gap: users can rename/delete folders but **cannot create a collection or add a single bookmark by URL** (`ContextMenu.jsx`). New users with zero collections are stuck with "Save Tabs" as the only entry point.
- **Step:** "+ New Collection" in the Toolbar (`Toolbar.jsx:50`) and Sidebar header (`Sidebar.jsx:138`), wired to a new `createCollectionFolder(parentId, title)`; "Add bookmark" in the collection context menu using `createBookmark`.

### P2-2 · Trash restore / empty UI — **M**
Soft delete moves to `.TabHub Trash` which is hidden from the UI (`bookmarkService.js:175`); once the 8s undo expires, deleted bookmarks are unrecoverable in-app. A trash you can't open is a data-loss trap.
- **Step:** "Trash" entry in `Sidebar.jsx` (shown when `trashFolderId` set) opening a read-only view with per-item **Restore** and **Empty Trash**. (`trashFolderId` is already threaded through `getCollectionsPayload`.)

### P2-3 · Settings panel + API-key management — **M**
`setApiKey` is never called from any UI, so Claude mode is permanently unreachable — all "AI" features run mock-only (mock categorize knows ~17 domains). There's also no home for model choice, default open behavior, etc.
- **Step:** gear icon in the sidebar header → modal (reuse `EditBookmarkModal` shell). Password input bound to `getApiKey`/`setApiKey`, "Test connection", an "AI: Active / Mock" badge in the Toolbar, model dropdown. Move Theme + Language here.

---

## Phase 3 — Power features

### P3-1 · Import / export / backup — **M**
No way to export the TabHub layout (migration, sharing, backup before a risky Auto-Organize/AI-move). Add Export (serialize `getCollectionsPayload` → JSON download) and Import (recreate via `createBookmark`) in Settings; Netscape bookmark HTML as a fast-follow.

### P3-2 · Save-Tabs preview + naming — **M**
`S` immediately dumps all http(s) tabs into an ISO-timestamp-named folder with no preview, naming, dedup, or confirmation toast (`bookmarkService.js:205`). Add a modal listing tabs with checkboxes, an editable folder name, and a target-collection selector; at minimum fire a "Saved N tabs" toast.

### P3-3 · Open-all-in-collection + open-in-new-tab — **S-M**
Core Toby workflow missing. Single open replaces the new-tab page (`openBookmarkInCurrentTab`, `bookmarkService.js:260`). Add "Open all" to the collection header (`chrome.tabs.create` per card) and respect Ctrl/middle-click to open a single card in a background tab.

### P3-4 · Surface tags — **M**
`generateTags()` (`enrichmentService.js:81`) produces useful labels but nothing renders/filters them. Render tag chips on `BookmarkCard` (`CollectionCard.jsx:57`) and make chip clicks filter the view. (Pairs with P1-2: wires up the otherwise-dead enrichment code.)

### P3-5 · Cross-source search — **M**
`smartSearch` runs only over the active source's `allCards` (`main.jsx:92`); a bookmark under another source returns zero hits with no indication other sources exist. When a query yields few/no results, query across all sources and group matches by source.

---

## Phase 4 — Polish, accessibility, i18n

### P4-1 · Replace `window.confirm`/`prompt` with styled modals — **S-M**
Delete/rename/batch-trash use blocking native dialogs (`main.jsx:740,871,888,902,988`) — jarring, unstyled, untranslatable. Add a reusable `ConfirmModal`; convert rename to an inline editable field.

### P4-2 · Accessibility pass — **M**
All overlays lack `role="dialog"`/`aria-modal`, Escape-to-close, focus trap, and focus restore; `UndoToast` isn't an `aria-live` region (its Undo button is unreachable before it vanishes); the context menu is mouse-only. Build a shared `<Modal>` wrapper (dialog role, Escape, focus trap + restore) and use it everywhere; add `aria-live="polite"` to the toast; make the context menu keyboard-navigable.

### P4-3 · Reduced-motion + keyboard drag alternative — **M**
`index.css` has no `prefers-reduced-motion` block despite global transitions/keyframes. There's also no keyboard path to move cards. Add a `@media (prefers-reduced-motion: reduce)` block; surface "Move to…" in the single-card context menu (reuse `BatchMoveModal`) as the keyboard-accessible move path.

### P4-4 · Complete i18n — **M**
Chat replies (`chatService.js:93,96,115,…`), enrichment errors ("请求超时"/"无法访问", `enrichmentService.js:36`), and mock categorize reasons (`aiService.js:167`) are hardcoded Chinese regardless of language; Claude prompts force "Chinese response." Route all through `t()`; make the prompt respect the current language. Also fix i18n reactivity (the `forceUpdate` hack at `main.jsx:68,823`) via a `LanguageContext`.

### P4-5 · First-run onboarding — **M**
A fresh install opens to an empty `📑` state with one line of hint and (today) no way to create a collection. Detect first-run and show a welcome card with three CTAs: Save current tabs / Create a collection / Connect AI (optional).

### P4-6 · Smaller wins — **S each**
- Persist `activeSourceId`/`activeCollectionId`/sidebar-collapsed to `chrome.storage.local` (they reset every new tab).
- Collapsed sidebar renders nothing — show an icon-only rail of collection folders (`Sidebar.jsx:61`).
- Update `CLAUDE.md` structure section (stale: omits `i18n.js`, mislabels `BookmarkCard.jsx`).

---

## Phase 5 — Refactor `main.jsx` god component + grow test coverage

### P5-1 · Extract hooks from `App` (1161 lines, 22 state slots) — **M-L**
In order of leverage/safety:
1. `useCollections()` — data spine (`tabHubRootId`/`sources`/`activeSourceId`/`collections`/`refresh` + init effect). Lowest risk, everything depends on `refresh`.
2. `useBookmarkActions()` — the undo-wrapped mutations sharing the snapshot→move→`showUndo`→`refresh` pattern.
3. Feature hooks — `useAICategorize`/`useDeadLinkCheck`/`useChat` (each owns its modal state + handlers).
4. `useCardDragAndDrop()` — the three SortableJS effects + 5 suppression refs + the manual DOM revert. **Do last** (highest risk: encodes Chrome-compat workarounds).
- Result: `App` becomes a ~250-line composition root. Per-modal `useReducer` (states: `idle|loading|ready|error|saving`) replaces the scattered partial-spread updates.

### P5-2 · Close the test gaps — **M**
0 tests on the riskiest code: `bookmarkService.js` (tree-walk, `getCollectionsPayload`, trash), `main.jsx`, all 3 hooks, `i18n.js`, 11 of 12 components. Priority: `bookmarkService.test.js` driving `getCollectionsPayload` against a fixture tree (the `setup.js` mock already supports overrides); `useUndoStack` with fake timers; one Testing-Library `<App/>` smoke test for the load→render path.

---

## Suggested execution order

1. **Phase 0** (correctness) — ship as one or two PRs; P0-1/P0-6 together.
2. **P1-1 (CI)** + **P1-2 (dead code)** — immediate, cheap, reduces surface area.
3. **Phase 2** (create collections, trash restore, settings/API key) — unblocks the core loop and the advertised AI features.
4. **P1-3/P1-4** (shared `claudeClient` + `taxonomy`) — do alongside Phase 2/3 AI work.
5. **Phase 3** power features, **Phase 4** polish/a11y as product priorities dictate.
6. **Phase 5** refactor + tests — best done once feature surface stabilizes; P5-1 step 1 can start anytime.

**Highest-leverage single changes:** P0-1 (drag index — the most material confirmed bug), P2-1 (create collections — unblocks new users), P2-3 (settings/API key — makes the AI features actually reachable).
