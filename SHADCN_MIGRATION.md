# TabHub — shadcn/ui migration

Branch: `ui/shadcn-migration`. Base before migration: `rebase-review-fixes` @ `c8a705e`.

| Phase | Scope | Status | dist/ smoke-tested in Chrome |
| --- | --- | --- | --- |
| P0 | Foundation + shadcn slate palette + Toolbar pilot | done | not yet |
| P1 | Dialog / AlertDialog (8 dialog surfaces) | pending | — |
| P2 | ContextMenu / DropdownMenu | pending | — |
| P3 | Form primitives (Input / Label / Select / Switch / Textarea) | pending | — |
| P4 | Feedback (Sonner toasts, Tooltip) | pending | — |
| P5 | Cards / Sidebar — **gated, optional** | pending | — |

Every phase ends with `./scripts/verify-ui.sh` exiting 0 and one commit named
`feat(ui): P<N> — <summary>`.

---

## Ground rules (all phases)

1. **Never run `shadcn init`.** It is destructive here — see Landmines. Adding a new
   primitive is `npx shadcn@4.21.0 add <name> -y`, then re-run the gate script.
2. **Never edit `src/components/ui/*`** (vendored, regenerable) — the single exception is
   `sonner.jsx`, already patched. Wrap or compose instead of editing.
3. **Never change a component's prop API.** `App` in `main.jsx` owns all state; frozen
   props are what make phases independently revertible and parallel-safe.
4. **Only the phase that declares `main.jsx` may touch `main.jsx`.**
5. All user-facing strings go through `t()` from `src/lib/i18n.js`.
6. Colours come from Tailwind token classes (`bg-background`, `text-muted-foreground`,
   `border-border`, …) or the legacy `var(--x)` aliases. Never add an **unprefixed**
   shadcn CSS variable to `index.css` — gate 6 rejects it.
7. Tests are replaced, never deleted: the gate fails if the total count drops.

## Landmines already handled — do not "fix" them back

1. **`shadcn init` overwrites whatever sits at `aliases.utils`.** It silently replaced the
   50-line `src/lib/utils.js` (`faviconCandidates`, `normalizeUrlKey`, `sortSnapshots`)
   with a 6-line `cn` file. Hence `cn()` lives in `src/lib/cn.js`. Gate 7 guards this.
2. **shadcn 4.x + Tailwind 3 emit incompatible colour spaces.** `init` writes **oklch**
   values into the CSS while writing `hsl(var(--x))` into the Tailwind config, producing
   `hsl(oklch(...))` — every colour class dies silently. `components.json` is therefore
   hand-written and the token layer is hand-maintained HSL. Gate 4 guards this.
3. **`--accent` / `--muted` mean different things** in this project (brand accent /
   secondary text) than in shadcn (hover surface / surface). All shadcn tokens are
   namespaced `--ui-*` and mapped in `tailwind.config.js`. Gate 5 and 6 guard this.
4. **`sonner.jsx` ships importing `next-themes`**, which does not belong in a Vite
   extension. It was rewritten to take a `theme` prop; `next-themes` is uninstalled.
   Gate 8 guards this.

Two more deliberate choices: `darkMode` keys off `:root[data-theme="dark"]` to match
`src/hooks/useTheme.js`, and `--ui-radius: 0.5rem` keeps `rounded-lg`/`rounded-md` at their
pre-migration pixel values across 82 existing usages.

## Palette

`--ui-*` are shadcn's **slate** tokens copied verbatim from the registry. The 21 legacy
variables (`--bg`, `--text`, `--accent`, …) are now thin aliases over them, so all 384
existing `var(--x)` usages follow shadcn's day/night palette with no component edits.

shadcn slate `primary` is monochrome, so TabHub's blue is gone by design. Restoring it is
a two-line override documented at the top of `src/index.css`.

---

## Fallback plan

Ordered cheapest-first. Every layer is independent of the others.

**L0 — palette only.** Revert the `:root` / `:root[data-theme='dark']` hunk in
`src/index.css`. The whole app returns to the old blue/grey palette with zero component
changes, because every legacy variable is an alias. Migrated shadcn components follow along
automatically.

**L1 — one phase.** `git revert <phase commit>`. Phases own disjoint files and never
change prop APIs, so any of P1–P5 can be reverted in any order. P0 is the shared base.

**L2 — one component.** `git checkout <P0 commit> -- src/components/X.jsx`. Restores the
hand-rolled version of a single component. Valid precisely because prop APIs are frozen.

**L3 — full abort.** `git checkout rebase-review-fixes`. That branch is never touched by
this work. Outside the token layer, P0 is purely additive (alias, `cn.js`,
`components.json`, `src/components/ui/`).

**L4 — behaves badly in the real extension though tests are green.** Revert to the last
row of the table above whose `dist/` was smoke-tested in Chrome, rebuild, reload the
unpacked extension.

**Rollback budget:** a phase that is not green after two attempts gets reverted, not
patched forward. `dist/` is a build artifact — always rebuild after a revert.

---

## P1 — Dialog / AlertDialog

**Owns:** `src/components/Modal.jsx` (delete), `ConfirmModal.jsx`, `PromptModal.jsx`,
`EditBookmarkModal.jsx`, `BatchMoveModal.jsx`, `SaveTabsModal.jsx`, `SettingsModal.jsx`,
`AICategorizeModal.jsx`, `DeadLinkModal.jsx`, `src/test/AICategorizeModal.test.jsx`.
**Must not touch** `main.jsx`.

Context: there are currently **three** overlay implementations — the shared `Modal.jsx`
(6 components, `z-60`, 107 lines of hand-rolled focus trap) plus `ConfirmModal` and
`PromptModal` each with their own `fixed inset-0` at `z-70`.

Acceptance:
- [ ] `./scripts/verify-ui.sh` exits 0
- [ ] `Modal.jsx` deleted; `grep -r FOCUSABLE_SELECTOR src/` returns nothing
- [ ] `grep -rn 'fixed inset-0' src/components/*.jsx` returns nothing (no hand-rolled overlay survives)
- [ ] all 8 surfaces use `Dialog`; `ConfirmModal` uses `AlertDialog` (it is a confirm, and
      AlertDialog correctly refuses to close on overlay click)
- [ ] every dialog exposes an accessible name via `DialogTitle` (visually hidden is fine)
- [ ] **≥5 new/updated RTL tests**, one per behaviour the hand-rolled trap provided:
      focus lands inside on open · `Escape` closes · overlay click closes (non-alert dialogs)
      · focus returns to the trigger on close · `Tab` cycles within the panel
- [ ] **`Escape` fires exactly once.** `src/hooks/useKeyboardShortcuts.js` also listens for
      `Escape`; prove with a test that closing a dialog does not additionally dismiss the
      panel/menu behind it
- [ ] nesting preserved: a confirm opened from another dialog still renders above it
- [ ] `git diff` shows **no change to `main.jsx`** and no prop renames
- [ ] `AICategorizeModal.test.jsx` updated for portal rendering — the two assertions on
      `container.firstChild` (closed-state null check, overlay click) must assert the same
      user-visible behaviour, not be deleted
- [ ] manual: open all 8 dialogs in the loaded extension, no console errors

Risk: medium. Fallback: L2 per file.

## P2 — ContextMenu / DropdownMenu

**Owns:** `src/components/ContextMenu.jsx`, `main.jsx` (wiring only),
`CollectionCard.jsx` (trigger attachment only).

Implementation note: Radix's `ContextMenu` primitive derives its position from a
`Trigger` that must **wrap** the right-clicked element. Both trigger sites are
SortableJS-managed hosts — `Sidebar`'s collection rows (owned by P4, off-limits to P2)
and `CollectionCard`'s cards — and wrapping them would also have forced a prop-API
change on `CollectionCard`, breaking ground rule 3. `ContextMenu.jsx` therefore uses
`DropdownMenu` anchored to a zero-size virtual anchor at the stored pointer
coordinates: the `contextMenu` state object and every prop API survive untouched, no
DOM node is inserted anywhere near a draggable host, and Radix still owns roving
focus, `Escape`, dismissal, collision handling and ARIA. `modal={false}` so the
menu never locks body scroll or disables pointer events on the Sortable lists below.

Acceptance:
- [x] gate exits 0 — 11 checks, 185 tests (baseline 171)
- [x] the 190-line hand-rolled `ArrowUp`/`ArrowDown`/`Tab` handler is gone
- [x] right-click opens the menu at the pointer, for both a bookmark card and a collection
      header (the card header trigger is new: `CollectionCard`'s header button now takes
      an optional `onCollectionContextMenu`)
- [x] ≥2 tests: menu opens on `contextmenu`; each item invokes the same callback as before
      (`src/test/ContextMenu.test.jsx`, 15 tests)
- [x] Radix keyboard nav (`Arrow`, `Home`, `End`, `Escape`) — covered by jsdom tests;
      **still unverified in a real browser**
- [x] **opening a menu on a draggable card must not start a drag**, and closing it must not
      leave a `.card-dragging` class behind — all three Sortable scopes use an explicit
      `handle:` selector and SortableJS ignores `button !== 0`
- [x] `data-card-id` / `data-collection-id` remain on the *same* DOM nodes — they appear in
      no diff hunk at all; asserted structurally in `ContextMenu.test.jsx`
- [x] `[data-radix-popper-content-wrapper] { transition: none }` still present in `index.css`
      (removing it makes menus slide in from their previous position)
- [ ] manual: drag a card → right-click it → drag it again; no `removeChild` crash
      — **not done, needs a loaded extension**

Risk: medium-high — SortableJS adjacency. Fallback: L1.

## P3 — Form primitives

**Owns:** `Toolbar.jsx` (search input), `SettingsModal.jsx`, `EditBookmarkModal.jsx`,
`PromptModal.jsx`, `SaveTabsModal.jsx`, `BatchMoveModal.jsx`, `ChatPanel.jsx`.
Runs **after P1** (shares files).

Acceptance:
- [ ] gate exits 0
- [ ] `grep -c '<select' src/components/*.jsx` is 0 — all 3 bare selects replaced
- [ ] 12 `<input>` / 12 `<label>` migrated to `Input` / `Label`
- [ ] every field has a `Label htmlFor` or an `aria-label`
- [ ] `/` still focuses the search box (test) and the `/` kbd hint still renders
- [ ] `Enter` still submits in `PromptModal` and `EditBookmarkModal` (test)
- [ ] the API key field stays `type="password"`; the storage round-trip test stays green
- [ ] `ChatPanel` keeps its existing send-key behaviour exactly

Risk: low. Fallback: L2 per file.

## P4 — Feedback (Sonner, Tooltip)

**Owns:** `UndoToast.jsx`, `main.jsx` (mount `Toaster`), `Sidebar.jsx` + `Toolbar.jsx`
(tooltips), `src/test/AICategorizeModal.test.jsx`.

Acceptance:
- [ ] gate exits 0
- [ ] undo still fires inside the 8s window and `src/hooks/useUndoStack.js` timing logic is
      **unchanged** (that hook owns the timer; the toast is only the surface) — test it
- [ ] `Toaster` gets `theme={resolvedTheme}` from `useTheme`, never `next-themes`
- [ ] icon-only buttons get `Tooltip` **plus** an `aria-label`
- [ ] `AICategorizeModal.test.jsx` migrated off `getByTitle('接受')` / `getByTitle('拒绝')`
      to accessible-name queries **in the same commit** that removes those `title` attributes
- [ ] no tooltip opens while a card is being dragged

Risk: low, except the `getByTitle` coupling. Fallback: L1.

## P5 — Cards / Sidebar — gated

Start only if P1–P4 are merged, green, and smoke-tested. Default decision is **skip**:
`main.jsx` already performs a delicate revert of SortableJS's DOM mutation before React
reconciles, and restructuring the draggable hosts is how that breaks.

Acceptance (all required):
- [ ] gate exits 0
- [ ] `data-card-id` / `data-collection-id` / `data-draggable` sit on the **same element at
      the same depth** relative to their Sortable container — reviewed as a diff
- [ ] manual matrix, each with a DevTools console open and zero errors: reorder within a
      collection · move across collections · reorder the nav sidebar · drag while a search
      filter is active · drag in manage mode · reload and confirm the order persisted
- [ ] `moveBookmarkToCardPosition()` still receives card-relative indices in a collection
      that also contains subfolders

Risk: high. Fallback: L1, immediately.

---

## Cross-run protocol (subagents)

Phases that share files are never run concurrently. Each implementer works in its own git
worktree (`node_modules` symlinked from the main checkout — it is gitignored, so a fresh
worktree has none).

```
Wave 1   implement P1  ┐            (disjoint files: P1 never touches main.jsx)
         implement P2  ┘
Wave 1'  review: the P1 reviewer is a different agent than the P1 implementer, and
         vice-versa — each reviewer independently re-runs ./scripts/verify-ui.sh and the
         phase's functional checklist against the other agent's diff
Wave 2   implement P3 (after P1 merges), implement P4 — then cross-review again
Wave 3   P5 only if explicitly approved
```

Reviewer rules: a reviewer **reports, it does not fix**. It must re-run the gate itself
rather than trust the implementer's transcript, must check the unchecked boxes of the
phase's acceptance list one by one, and must explicitly confirm the ground rules
(no `ui/*` edits, no prop-API change, no `main.jsx` change outside the owning phase).
A phase merges only when its reviewer reports every box checked.
