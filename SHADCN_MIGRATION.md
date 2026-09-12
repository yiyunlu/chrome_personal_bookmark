# TabHub — shadcn/ui migration

Branch: `ui/shadcn-migration`. Base before migration: `rebase-review-fixes` @ `c8a705e`.

| Phase | Scope | Status | dist/ smoke-tested in Chrome |
| --- | --- | --- | --- |
| P0 | Foundation + shadcn slate palette + Toolbar pilot | done | not yet |
| P1 | Dialog / AlertDialog (8 dialog surfaces) | merged, reviewed | **not yet — see smoke list** |
| P2 | ContextMenu / DropdownMenu | merged, reviewed | **not yet — see smoke list** |
| P3 | Form primitives (Input / Label / Select) | merged, reviewed | **not yet — see smoke list** |
| P4 | Feedback (Sonner, Tooltip) + undo reachability + Trash dialog | merged, reviewed | **not yet — see smoke list** |
| P5 | Cards / Sidebar — **gated, optional** | pending | — |

Every phase ends with `./scripts/verify-ui.sh` exiting 0 and one commit named
`feat(ui): P<N> — <summary>`.

---

## Writing acceptance criteria

Two boxes in this document were unsatisfiable as written, and both cost a phase real work:
a repo-wide `grep` demanded in a phase that owns only part of the repo, and the word "still"
applied to behaviour that never existed. **Verify the baseline before writing a box.** If a
box says "still", prove the old behaviour exists first; if it greps the repo, check every
match falls inside that phase's Owns list.

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

**Implementation note (merged):** the phase does **not** use shadcn's `DialogContent` /
`AlertDialogContent`. Those wrappers unconditionally render a second close button (all 8
surfaces already have one) and render their own `Portal` + `Overlay` internally at a fixed
`z-50` with no className passthrough, which would put a nested confirm's scrim *under* the
dialog that opened it. Neither is reachable through `className`. So `DialogShell.jsx` owns
the panel geometry, centering, radius, border, shadow, backdrop colour and both animation
sets; from `src/components/ui/*` we take only `Root`, `Portal`, `Overlay`, `Title` and
`Description`. For this phase "using shadcn" means Radix behaviour + shadcn tokens, not
shadcn's dialog chrome — which also means a future `npx shadcn add dialog --overwrite`
buys less here than it looks.

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
- [x] gate exits 0 — 11 checks, 186 tests (baseline 171)
- [x] the 190-line hand-rolled `ArrowUp`/`ArrowDown`/`Tab` handler is gone
- [x] right-click opens the menu at the pointer, for both a bookmark card and a collection
      header (the card header trigger is new: `CollectionCard`'s header button now takes
      an optional `onCollectionContextMenu`)
- [x] ≥2 tests: menu opens on `contextmenu`; each item invokes the same callback as before
      (`src/test/ContextMenu.test.jsx`, 15 tests)
- [x] Radix keyboard nav (`Arrow`, `Home`, `End`, `Escape`) — covered by jsdom tests;
      **still unverified in a real browser**
- [~] **opening a menu on a draggable card must not start a drag**, and closing it must not
      leave a `.card-dragging` class behind — **code-verified only, not test-covered.**
      All three Sortable scopes use an explicit `handle:` (`main.jsx:355,387,442`) and
      sortablejs bails on `evt.button !== 0` (`sortable.esm.js:1196`). The assertions that
      originally claimed this box were vacuous — `.card-dragging` is only ever Sortable's
      `ghostClass` and the test harness instantiates no Sortable — and have been removed.
      On the manual smoke list.
- [x] `data-card-id` / `data-collection-id` remain on the *same* DOM nodes — they appear in
      no diff hunk at all; asserted structurally in `ContextMenu.test.jsx`. (Gate 9 now
      counts with `--exclude-dir=test`, so selectors added in a test file can no longer
      mask an attribute removed from a component.)
- [x] `[data-radix-popper-content-wrapper] { transition: none }` still present in `index.css`
      (removing it makes menus slide in from their previous position)
- [ ] manual: drag a card → right-click it → drag it again; no `removeChild` crash
      — **not done, needs a loaded extension**

Risk: medium-high — SortableJS adjacency. Fallback: L1.

## P3 — Form primitives

**Owns:** `Toolbar.jsx` (the whole file — P4 must not touch it), `SettingsModal.jsx`,
`EditBookmarkModal.jsx`, `PromptModal.jsx`, `SaveTabsModal.jsx`, `BatchMoveModal.jsx`,
`ChatPanel.jsx`. Runs **after P1** (shares files). Note P1 rewrote all five modal files
listed here; build on the merged `DialogShell` versions, not the originals.

Acceptance:
- [ ] gate exits 0
- [ ] `grep -c '<select' src/components/*.jsx` is 0 — **mis-scoped when written.** Of the 3
      bare selects, 1 was `SaveTabsModal.jsx` (P3's, migrated) and 2 are `Sidebar.jsx:135,185`
      (the source and language switchers), which P3 does not own. Reaching into them would
      have broken the file-disjointness that makes P3 and P4 independently revertible. **The
      two `Sidebar.jsx` selects are handed to P4** (it already edits that file for tooltips,
      and `@radix-ui/react-select` is in the bundle either way). Within P3's own files: 0.
- [ ] 12 `<input>` / 12 `<label>` migrated — **also repo-wide counts, also mis-scoped.**
      Within P3's files the real numbers are 11 inputs and 9 labels; the rest live in
      `CollectionCard.jsx` (1 input, P5) and `Sidebar.jsx` (3 labels, P4). Done: 10 inputs →
      `Input` with SaveTabsModal's per-tab `type="checkbox"` left native (shadcn's `Input` is
      a text field and `checkbox` is a separate, unvendored primitive), and 8 labels →
      `Label` with SettingsModal's "Data" heading becoming a `<div>` (it names two buttons,
      not a control, so `Label` would emit an orphan `<label>` — it already was one).
- [ ] every field has a `Label htmlFor` or an `aria-label`
- [ ] `/` still focuses the search box (test) and the `/` kbd hint still renders
- [ ] `Enter` still submits in `PromptModal` and `EditBookmarkModal` (test)
- [ ] the API key field stays `type="password"`; the storage round-trip test stays green
- [ ] `ChatPanel` keeps its existing send-key behaviour exactly

Risk: low. Fallback: L2 per file.

## P4 — Feedback (Sonner, Tooltip)

**Owns:** `UndoToast.jsx`, `main.jsx` (mount `Toaster`, plus the Trash overlay below),
`Sidebar.jsx` (its tooltips *and*, by later agreement, its two native selects),
`AICategorizeModal.jsx` (its `title` attributes only), `src/test/AICategorizeModal.test.jsx`,
the new `src/test/undoToast.test.jsx` and `src/test/Sidebar.test.jsx`, and the toast half of
`src/test/dialog.test.jsx`'s z-order case. **`Toolbar.jsx` belongs to P3** — do not touch it;
toolbar tooltips are deferred to a later pass so the two waves stay file-disjoint.

**Inherited from P1 — the undo toast is now unreachable while any dialog is open.**
P1 raised dialogs to z-90/100 to clear `ChatPanel` (z-50) and the toast (z-80), so the
toast sits behind the scrim. But z-order is only part of it: Radix's modal Dialog sets
`disableOutsidePointerEvents`, which puts `pointer-events: none` on `document.body`, and
calls `hideOthers(content)`, which puts `aria-hidden` on `#root`. So the toast is also
pointer-inert and hidden from screen readers regardless of its z-index. **A z-index bump
alone will not fix this** — the toast needs `pointer-events: auto` and to sit outside
`hideOthers`' scope, i.e. in its own portal, which is what Sonner does anyway. Soft-delete
keeps its 8s timer running (`useUndoStack.js:27-30`) and the flows genuinely coexist
(delete a card, then `S` opens SaveTabsModal), so this is a real reachability bug, not a
cosmetic one.

**Also inherited: a ninth hand-rolled overlay.** `src/main.jsx:1571` renders the Trash
modal as an inline `fixed inset-0 z-50` with its own backdrop-click dismissal. P1 was
forbidden to touch `main.jsx` so it survived the dialog sweep, and no phase owned it —
it is now below both the new dialogs (z-90) and the toast (z-80). Migrate it to
`DialogShell` here, or state in this doc that it stays hand-rolled and fix its z-order.

### Implementation notes (implemented)

**One premise above is wrong, and the fix does not depend on it: Sonner does not portal.**
`sonner@2.0.8` imports `ReactDOM` only for `flushSync`; `grep -c Portal
node_modules/sonner/dist/index.mjs` is 0, and its `<section>` renders in place in the React
tree. Portalling to `<body>` would not have helped anyway — `hideOthers` walks `<body>`'s
*children*, so a direct child of body is marked like any other. What actually spares the
toast is `aria-hidden`'s explicit live-region exemption
(`node_modules/aria-hidden/dist/es2015/index.js`: `targets.push(…querySelectorAll(
'[aria-live], script'))`), which skips the matched node and leaves every ancestor of it
unmarked too. Sonner earns the exemption structurally: it renders
`<section aria-live="polite">` even with zero toasts, so mounting the `Toaster` for the life
of the app puts the exemption in place *before* any dialog opens. The old toast was rendered
only while a toast existed, so in the "open a dialog, then delete something" order it
mounted inside an already-`aria-hidden` `#root`.

**Pointer events had to be fixed by hand.** Sonner's stylesheet sets no `pointer-events` on
its container, so it inherits the `none` that `DismissableLayer` puts on `<body>`.
`UndoToast` passes `style={{ pointerEvents: 'auto' }}` to the `Toaster` (Sonner spreads
`style` onto the toast `<ol>`) and repeats it on the toast body. This, not the z-index, is
the half of the bug that ate the undo click: verified by mutation — deleting both makes
`undoToast.test.jsx`'s reachability test fail. That test also carries a control element with
the *old* toast's exact markup (`role=status`, `aria-live`, `z-[80]`) and asserts it is
pointer-inert.

**Stacking.** Sonner's injected stylesheet gives `[data-sonner-toaster]`
`position: fixed; z-index: 999999999`, well above P1's z-90/100. The App root is
`position: relative; z-index: auto`, which creates no stacking context, so that wins
globally. Asserted on the *computed* z-index, not on a class string.

**The Trash overlay was migrated to `DialogShell`** rather than kept hand-rolled with a
higher z-index. Three reasons: (1) it can *open* another dialog — Empty trash raises
`ConfirmModal` at `LAYER_TOP` (z-100) — so ordering it by hand means hand-tracking two
layers the shells already order by construction; (2) it was the last surface with no focus
trap, no Escape (it was not in `handleEscape` either), no `role="dialog"` and no accessible
name, and it is a list of buttons, so that was a real gap rather than a cosmetic one;
(3) a z-index-only fix keeps a ninth of the overlay logic hand-rolled for no gain, whereas
now the only `fixed inset-0` left in the source is the vendored `ui/dialog.jsx` /
`ui/alert-dialog.jsx` overlay (plus the comment in `main.jsx` recording this). Its inner
scroll region moved from
`flex-1 overflow-y-auto` on a flex panel to `maxHeight: 60vh`, matching the other eight.

**The two native selects in `Sidebar.jsx`** (source, language) were migrated to shadcn
`Select` here, at the coordinator's request: P3's acceptance asks for zero bare selects
repo-wide but P3 does not own this file. Same two workarounds P3 used — `z-[110]` on
`SelectContent`, and `[&_[data-radix-select-viewport]]:h-auto` from the content, because
shadcn pins the popper viewport to one row and `Viewport` accepts no `className`. The
trigger keeps the old control's colours and geometry (the sidebar is a dark panel that
shadcn's `bg-transparent`/`border-input` defaults disappear into); the floating list keeps
`bg-popover`, like P2's context menu. Both triggers are now named by their existing visible
`<label>` via `htmlFor`/`id`.

**The tooltip drag guard reads SortableJS's statics, not React state.** `Sortable.dragged`
is set on the pointerdown on a handle and cleared by `_nulling()` on drop, so
`dragInProgress()` in `Sidebar.jsx` covers the whole gesture without a render — a `dragging`
flag in React state would reconcile mid-drag, which is the failure mode `main.jsx` reverts
SortableJS's DOM mutation to avoid. The test drives a real `Sortable` instance with a real
`pointerdown`; removing the guard makes it fail.

**Bundle.** Sonner costs ≈10.4 KB gz (measured: 155,070 B with it against 144,648 B with
the hand-rolled toast restored and nothing else changed); Tooltip is ≈1.2 KB on top of the
Popper P2 already pulled in. Gate 11 passes at **155,066 B gz against the 160,000 cap —
4,934 B of headroom**, and that figure already includes `Select`, so merging P3 should not
move it. Stated plainly: the reachability fix itself needed only `pointer-events: auto` and
a permanently mounted live region, both of which a hand-rolled toast could have had for
0 bytes. Sonner buys the stacking, the queue, and one place for any future toast — but with
under 5 KB left, **P5 has essentially no bundle budget.**

Acceptance:
- [x] gate exits 0 — 11 checks, 231 tests (baseline 171; 212 before this phase)
- [x] undo still fires inside the 8s window and `src/hooks/useUndoStack.js` timing logic is
      **unchanged** (that hook owns the timer; the toast is only the surface) — test it
      (`undoToast.test.jsx`, "the 8s undo window survives the migration": undo fires at
      7.9s, and a click past the deadline does nothing; `git diff` shows the hook untouched)
- [x] `Toaster` gets `theme={resolvedTheme}` from `useTheme`, never `next-themes`
      (asserted through the rendered `data-sonner-theme`, both ways)
- [x] icon-only buttons get `Tooltip` **plus** an `aria-label` — the collapse toggle and the
      four collapsed-rail buttons. Two deliberate exceptions, argued in the code: the three
      theme buttons render their label beside the icon, so they take the `aria-label` and no
      tooltip; the expanded nav rows are not icon-only and are SortableJS children, so their
      `title` (the right-click hint) stays.
- [x] `AICategorizeModal.test.jsx` migrated off `getByTitle('接受')` / `getByTitle('拒绝')`
      to accessible-name queries **in the same commit** that removes those `title` attributes
      (`grep -rn getByTitle src/` is empty)
- [x] no tooltip opens while a card is being dragged — see the drag guard note above
- [x] the undo toast is reachable while a dialog is open: neither `aria-hidden` nor
      pointer-inert, proven against two controls that are
- [x] the ninth overlay is gone — the Trash modal is a `DialogShell`
- [ ] manual: the browser-only items added to the smoke list below

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

## Manual smoke list (browser-only; no agent can check these)

The gate script and the RTL suites cannot reach drag-and-drop, real popper placement or
the extension runtime. Build, load `dist/` as an unpacked extension, and walk this list
with the DevTools console open. Record the result in the status table's last column.

**From P2 (merged):**
- right-click a bookmark card, then right-click a *different* card without dismissing —
  the menu repositions by mutating the anchor's inline `left/top` rather than remounting,
  so placement depends on floating-ui's layout-shift observer
- drag a card → right-click it → drag it again; no `removeChild` crash
- right-click a collection header (this trigger is **new** in P2 — it did not exist before)
- keyboard: `Arrow`, `Home`, `End`, `Escape` inside an open menu
- a left-click outside the menu both dismisses it *and* activates what was clicked. This
  matches the old hand-rolled behaviour but differs from a native OS context menu.
- visual deltas to eyeball: menu surface moves from `var(--panel-bg)`/`rounded-xl`/
  `animate-slide-up` to `bg-popover`/`rounded-md`/`shadow-md` with no entry animation;
  hover moves from `var(--hover)` to `focus:bg-accent`; the vendored item class
  `[&>svg]:size-4` overrides `size={14}` icon props to 16px

**From P4 (implemented):**
- delete a card, then press `S` while the toast is up: the toast must stay above
  `SaveTabsModal` and its Undo button must still click. jsdom proves the computed
  `pointer-events`; only a browser proves the hit test.
- the toast moved from `right-4 bottom-4` / `animate-slide-in-right` to Sonner's own
  container (`offset={16}`, 356px max width, Sonner's lift-and-slide transitions), so a long
  message such as `autoOrganizeResult` now wraps instead of widening
- hover the collapsed rail's icons: tooltip placement comes from floating-ui and is
  unverifiable in jsdom. Then start dragging a collection row over them — no tooltip may
  appear.
- open the Trash dialog, then Empty trash: the confirm must sit above the trash panel, and
  Escape must close only the topmost of the two
- both sidebar selects: the popper list must be full height (not one row) and must not be
  clipped; `z-[110]` and the viewport override are asserted only as class strings
- the accept/reject tooltips inside `AICategorizeModal` must render *above* the dialog panel
  (`z-[110]` against the panel's z-90) — class-string-only in jsdom as well

**From P1 (merged):**
- open all 8 dialogs; console must stay clean (the RTL stand-in catches React's warnings
  but Radix 1.1.23 emits none of its own, so a missing `DialogTitle` would only show here)
- does `RemoveScroll`'s body lock cause a scrollbar-width layout shift when a dialog opens?
  `<main>` (`main.jsx:1348`) is `overflow-y-auto` inside a `min-h-screen`, so which element
  actually scrolls is ambiguous from the source alone
- the nested confirm-over-dialog scrim: the z-order test only parses class strings, it
  proves nothing about rendered stacking
- `SettingsModal` is the one surface with no inner scroll region and no panel max-height —
  pre-existing, not a P1 regression, but check it does not clip on a short window
- confirm dialogs no longer dismiss on a backdrop click (AlertDialog semantics, intended)
  and now autofocus Cancel

**From P3 (merged):**
- open **Save tabs** and the target dropdown: it must render *above* the dialog panel
  (`SelectContent` is vendored at `z-50` and portals to `document.body`, outside the dialog's
  own portal, so it is overridden to `z-[110]`) and it must show the **full list**, not one
  scrollable row. shadcn pins the popper `Viewport` to `h-[var(--radix-select-trigger-height)]`
  and `Viewport` accepts no `className`, so the fix is an ancestor selector
  (`[&_[data-radix-select-viewport]]:h-auto`) that hangs on an undocumented Radix data
  attribute. **It would fail silently and no test can see it — jsdom has no layout.**
- the dropdown's flip/placement near the bottom of the window, and its `bg-popover` surface
  in both themes; choosing an option must not dismiss the dialog
- click into the toolbar search **with the mouse**: the accent ring must appear. The rings
  moved from `:focus` to `:focus-visible`, and separately `twMerge` had been deleting
  `ring-[var(--accent)]` outright (see the commit after P3's merge) — worth one real look.
- placeholder text colour moved from the UA default to `text-muted-foreground` on every
  field, and `Input` is `display:flex` where the raw input was `inline-block`

**From P4 (merged):**
- delete a card, press `S` to open Save tabs, then click **Undo**. The undo must run
  **and the dialog must stay open.** The toast deliberately lives outside the dialog's
  portal, so Radix counted a click on it as an outside interaction and dismissed the
  dialog — discarding the tab selection. `DialogShell` now ignores pointer-downs inside
  `[data-sonner-toaster]`; `src/test/dialogToastGuard.test.jsx` guards it and was
  mutation-checked, but only a browser exercises the real deferred-click path.
- the same scenario with the keyboard: **known unfixed.** Radix's `FocusScope` is trapped
  while a dialog is open, so the Undo button cannot be reached by `Tab` (nor by Sonner's
  hotkey). The mouse path and the screen-reader announcement work; keyboard-only users
  must close the dialog first. Fixing it means registering the toast as a Radix
  dismissable *branch*, which is a larger change than this phase warranted.
- open Trash: `Escape` closes it, focus is trapped, focus returns to the opener, a
  backdrop click still dismisses, and a long trash list scrolls rather than clipping
  (its scroll region moved from `flex-1 overflow-y-auto` to `maxHeight: 60vh`). **No test
  covers this surface at all.**
- Empty trash from inside Trash: the confirm must render above it (Trash is `LAYER_BASE`,
  the confirm `LAYER_TOP` — by construction, but the z-order tests only parse class strings)
- a long toast message (auto-organize's summary) now wraps instead of widening: Sonner caps
  the container at 356px where the old toast grew. Entry/exit is Sonner's lift-and-slide.
- hover the collapsed sidebar rail: real tooltips instead of the OS `title` delay. Then
  start dragging a nav row and confirm no tooltip appears mid-drag.
- both sidebar dropdowns (source, language) are now poppers, not native OS selects.

**Known open item, not a P2 defect:** after a menu closes, focus lands on `<body>`, so a
keyboard user's next Tab restarts at the top of the page. Identical to the pre-migration
behaviour. Restoring focus to the right-clicked element needs that element in the
`contextMenu` state object — deliberately deferred.

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
