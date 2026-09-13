# TabHub — shadcn/ui migration

Branch: `ui/shadcn-migration`. Base before migration: `rebase-review-fixes` @ `c8a705e`.

| Phase | Scope | Status | dist/ smoke-tested in Chrome |
| --- | --- | --- | --- |
| P0 | Foundation + shadcn slate palette + Toolbar pilot | done | not yet |
| P1 | Dialog / AlertDialog (8 dialog surfaces) | merged, reviewed | **not yet — see smoke list** |
| P2 | ContextMenu / DropdownMenu | merged, reviewed | **not yet — see smoke list** |
| P3 | Form primitives (Input / Label / Select) | merged, reviewed | **not yet — see smoke list** |
| P4 | Feedback (Sonner, Tooltip) + undo reachability + Trash dialog | merged, reviewed | **not yet — see smoke list** |
| P5a | `CollectionCard` — cards on shadcn primitives | merged, reviewed | **not yet — see smoke list** |
| P5b | `Sidebar` — the rest of the rail | merged, reviewed | **not yet — see smoke list** |
| S1 | Shell: sidebar | merged, reviewed | **not yet — see smoke list** |
| S2 | Shell: toolbar | merged, reviewed | **not yet — see smoke list** |
| S3 | Shell: content area + list view | merged, reviewed | **not yet — see smoke list** |
| P6 | **Style unification** — one token system, no hand-styling left | **done — gate 12 at 0/0/0/0** | **not yet — see smoke list** |

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

## Source of truth

**`TabHub.dc.html` (Claude Design project `c3755d9a`) is the source of truth for visuals.
The existing app is the source of truth for behaviour.** Nothing in the design file adds,
removes or changes a feature. Where the two disagree, that split decides it:

| the design shows | we do |
| --- | --- |
| coloured letter tiles instead of favicons | keep real favicons, inside the design's 22px tile |
| no drag handles anywhere | keep drag; the handles are hover-only, so the static design never showed them |
| a source *button* that cycles | keep the `Select` — choosing among N sources is behaviour |
| light/dark only | keep system/light/dark |
| no language switcher | keep it |
| nothing for the 9 dialogs, the context menu, the chat panel, the toast, the trash | keep them; they inherit the tokens automatically |
| a grid/list view toggle | **in scope after all** — tags live in the list view, so the grid tile can stay two lines |
| 11–14px glyphs | **sized by the control they sit in** — see the icon table. The first version of this row said 16px wins, on the argument that gate 12 counted anything else as drift; that was the two-size rule overriding the design it was meant to serve, and it was replaced. |

Note on ownership: **every phase may add keys to `src/lib/i18n.js`** — ground rule 5 requires
it and the Owns columns below do not repeat it. Additions are contiguous per dictionary, so
concurrent phases conflict textually and resolve as "keep both".

That last row is the payoff from P1–P5: every one of those surfaces is already on token
classes, so a palette swap re-skins them with no edits. They will read as shadcn components
wearing the new palette rather than bespoke design work, because the design file does not
cover them.

## Bookmark tile

Two lines, per the design: title, then the domain in mono. **Tags do not render in the
grid** — they belong to the list view. The favicon keeps its place inside the design's
22px tile rather than being replaced by a tinted letter block; `BookmarkIcon` already
falls back on its own when every candidate URL fails.

Hover changes surface and border (`hover:bg-accent hover:border-input`), not elevation.
The old `[data-card-id]:hover` rule in `index.css` lifted the card and added a shadow, and
its `!important` beat any component-level hover — it is gone.

## Palette

`--ui-*` carry the design's palette, converted to HSL triplets because the Tailwind config
consumes `hsl(var(--ui-x))`. It is a **warm** neutral — every grey carries a 15-30° hue —
with a real brand accent at `#3b6fd4` (the design ships four; this is its blue). Both are deliberate departures from shadcn's
achromatic neutral and monochrome primary.

Three additions the shadcn scale does not have:
- **`--ui-faint`** — the design has a *third* text level (`--faint`) below
  `muted-foreground`, used for counts, URLs and section labels. Exposed as `text-faint`.
- **`--ui-sidebar`** — the design's `--panel`, distinct from both the page and the card.
- **`--ui-destructive` is not from the design.** The design defines no destructive colour
  and its accent is already red, so a stock red would collide with it. Ours is a darker,
  less saturated red that keeps an obvious lightness gap from the accent.

### Radius

Anchored on the design's own values rather than derived from a base radius, so every
shadcn primitive lands where the design puts it with **no per-call-site override**:

| Tailwind | px | primitive that ships it | design element |
| --- | --- | --- | --- |
| `rounded-sm` | 6 | `SelectItem`, `DropdownMenuItem`, `DialogClose` | nav rows, small tiles |
| `rounded-md` | 8 | `Button`, `Input`, `SelectTrigger`, `Badge` | buttons, search field |
| `rounded-lg` | 9 | `DialogContent`, `AlertDialogContent` | — |
| `rounded-xl` | 9 | `Card` | bookmark card |

This supersedes the earlier rule about letting a primitive keep its own radius. The rule is
now simply: **the design decides the scale, and the scale is set once in
`tailwind.config.js` so the primitives inherit it.**

### Type

`IBM Plex Sans` + `Noto Sans SC` for text, `IBM Plex Mono` for URLs, counts and section
labels — the mono is the design's strongest identifying feature, not decoration. Base size
is **13px**, not the browser's 16px; the design is dense throughout.

**The woff2 files are not bundled yet**, so the stack currently resolves to system
fallbacks. Adding them later needs no code change, only the font files and an `@font-face`
block. Loading them from Google Fonts instead would put a network request on every new tab
open, which is why it is not done that way.

### The tailwind-merge hazard — read this before overriding any vendored class

Three separate bugs in this migration came from `cn()` resolving a class string
differently than the source reads. All three are **silent**: the literal is still in the
source, the CSS rule is still in the bundle, only the resolved `className` is wrong. No
grep, no gate and no jsdom test can see any of them. **Resolve the real string through
`cn()` before believing an override works.**

**Mechanism A — a class deletes a differently-named one.** tailwind-merge's
`conflictingClassGroups` makes `text-*` remove `leading-*`, `flex-1` remove `shrink-0`,
`line-clamp-*` remove `flex` and `overflow-hidden`, `size-*` remove `w-*`/`h-*`, and the
familiar `p-*`/`m-*`/`gap-*`/`rounded-*`/`inset-*` shorthand families. *Restate anything
you did not mean to lose* — this is why `Label` overrides carry an explicit `leading-*`.

**Mechanism B — an arbitrary value loses to a later named one in the same group.**
`ring-[var(--accent)]` followed by `ring-opacity-30` resolves to just the opacity, which
is how the accent focus ring disappeared on nine controls. `bg-[var(--panel-bg)] bg-card`
likewise keeps only `bg-card`. **P6 converts 291 inline `var()` colours and will meet this
repeatedly.**

**Mechanism C — custom utilities are not merged at all.** This is the sneakiest, because
"is the class present?" checks pass: tailwind-merge only knows Tailwind's stock scales, so
a project utility it has never heard of does **not** displace the stock one. Both classes
reach the DOM and CSS source order decides. `shadow-panel` — the contract's own mapping
for `var(--shadow)` — would therefore have failed to override shadcn's `shadow`/`shadow-sm`
on `Button`, `Card`, `Input` and `SelectTrigger`.

**Mechanism D — a responsive prefix is its own merge group.** An unprefixed override does
not remove a responsive variant of the same property. shadcn's `Input` ships
`text-base md:text-sm`, so `text-[12.5px]` deleted `text-base` and left `md:text-sm`
alive — which then won from 768px up, i.e. on every real window. The search field had been
rendering 14px instead of 12.5px. **Source order does not save you**: the arbitrary class
is emitted *before* `md:text-sm` in the bundle.

Every responsive-prefixed class in `src/components/ui/`, so a phase can check before it
overrides. Nothing in the repo collides with these today — this is prevention:

| file | class | an unprefixed override of… silently fails |
| --- | --- | --- |
| `input.jsx`, `textarea.jsx` | `md:text-sm` | any `text-*` → 14px from 768px up |
| `dialog.jsx`, `alert-dialog.jsx` | `sm:rounded-lg` | any `rounded-*` → 9px from 640px up |
| `dialog.jsx`, `alert-dialog.jsx` | `sm:flex-row`, `sm:justify-end`, `sm:space-x-2`, `sm:text-left` | the footer's flex, justify, spacing and alignment |
| `alert-dialog.jsx` | `sm:mt-0` | any `mt-*` |

**P6a overrides all nine dialog surfaces and walks straight into the `sm:` set.** The rule:
*if a vendored base class carries a responsive prefix, your override must carry the same
prefix.*

**Mechanism E — a `hover:` variant is its own merge group.** Setting a base colour over a
`ghost` or `outline` Button leaves the variant's `hover:bg-accent hover:text-accent-foreground`
alive, and `.hover\:bg-accent:hover` out-specifies `.bg-primary\/10`, so **the pointer erases
the selection colour**. Three phases hit this independently (S2, P6a, P6b) and two reviews
enumerated the survivors: every active sidebar row and the theme control lost their tint on
hover. The one blessed idiom, and its single home in `Sidebar.jsx`'s `ACTIVE_ROW_CLASS`:

```
bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary
```

Resting `/10`, hover `/15`: hover nudges. `secondary`, `default` and `destructive` carry no
`hover:text-*`, so a colour over those is safe.

`src/lib/cn.js` registers the project's custom `shadow`, `ease` and `animate` scales with
`extendTailwindMerge`, which fixes mechanism C at the root. `src/test/cn.test.js` pins the
first four mechanisms, including the three historical bugs, so an upgrade cannot bring
them back unnoticed; mechanism E is pinned at each of its sites.

### Icons — sized by the control they sit in

The first version of this rule said "16 and 20, nothing else". That was my invention, like
the first radius table, and it ended up overriding the design: S1 and S2 both hit the
conflict independently and both had to ship 16px where the design asks for 11–13px. The
measured cost is not subtle — a 16px glyph in the design's 20px logo tile fills **80%** of
it against the design's 55%, so the accent chip stops reading as a mark on a tile and
becomes a square with a glyph jammed in. In a 30px row, 16px vs 13px is 51% more ink.

| size | for |
| --- | --- |
| `20` | empty-state and illustration icons |
| `16` | default — a glyph in a control ≥32px tall, or paired with text ≥13px |
| `12`–`13` | dense chrome: rows ≤30px, bottom-bar controls, counts, section affordances |
| `11` | inside a filled tile ≤20px |

**Inside `<Button>` a `size` prop is inert** — the cva's `[&_svg]:size-4` is a class and
beats the svg's width/height attributes. To get a dense glyph, put `[&_svg]:size-3` (12px)
or `[&_svg]:size-3.5` (14px) on the Button's own className. Outside a Button, pass
`size={n}`. Gate 12's counter accepts `{11, 12, 13, 16, 20}` and flags the rest.

### Buttons — no raw `<button>` outside `src/components/ui/`

| variant | for |
| --- | --- |
| `default` | the one primary action of a surface |
| `outline` | secondary and toolbar actions |
| `ghost` | icon-only affordances, row actions, close buttons — with `size="icon"` when icon-only |
| `destructive` | a confirmed destructive action (a confirm dialog's confirm button) |
| `ghost` + `text-destructive` | an inline destructive row action |
| `link` | inline text actions |

Every icon-only button carries `aria-label`, plus a `Tooltip` where no visible label exists.

### Typography — three roles

| role | classes |
| --- | --- |
| dialog / panel title | `text-base font-semibold` |
| section or card title | `text-sm font-semibold` |
| body | `text-sm` |
| meta / secondary | `text-xs text-muted-foreground` |

No other size in a component. The card-title row exists because a collection header is
a card title, not a dialog title, and matching the baseline there was the right call.

### Spacing

Dialog header and footer `px-5 py-4`, dialog body `p-5`, card padding `p-3`, control rows
`gap-2`, card grids `gap-3`.

---

## P5a — `CollectionCard`

**Owns:** `src/components/CollectionCard.jsx` and its tests. **Nothing else** — not
`main.jsx`, not `Sidebar.jsx`.

Verified baseline in this file: 23 inline `var()`, 3 raw `<button>`, 1 off-scale radius,
5 off-scale icon sizes. It carries all three drag-host attributes: `data-card-id`,
`data-collection-id`, `data-draggable`.

**This is the highest-risk file in the migration.** `main.jsx` drives three Sortable scopes
against it (`main.jsx:344,376,433`) and reverts SortableJS's DOM mutation before React
reconciles; the `onEnd` handler indexes `evt.from.children[oldIndex]` and reads
`evt.to.getAttribute('data-cards-collection-id')` (`main.jsx:499`).

Acceptance:
- [ ] `./scripts/verify-ui.sh` exits 0, and gate 12's four numbers **drop** (lower the
      ceilings in the script in the same commit)
- [ ] the file has 0 inline `var()`, 0 raw `<button>`, 0 off-scale radius, 0 off-scale icons
- [ ] shadcn `Card` composition where it is a genuine surface; `Button` for the 3 controls
- [ ] **`data-card-id`, `data-collection-id`, `data-draggable` sit on the same elements at
      the same depth relative to their Sortable container as at the P5 baseline** — proven
      by a side-by-side diff of the rendered DOM, not by counts
- [ ] the `data-cards-collection-id` / `data-parent-id` container is structurally unchanged
- [ ] `React.memo` is preserved and no new non-stable prop is introduced
- [ ] tests assert the host structure before and after a re-render
- [ ] manual (yours): the full drag matrix — reorder in a collection, move across
      collections, reorder nav, drag with a search filter active, drag in manage mode

## P5b — `Sidebar`

**Owns:** `src/components/Sidebar.jsx` and its tests. **Nothing else.**

Verified baseline: 36 inline `var()`, 10 raw `<button>`, 0 off-scale radius, 8 off-scale
icons. Carries `data-collection-id` and `data-draggable` on the expanded nav rows, which
are the `[data-nav-sortable]` scope's children.

Acceptance:
- [ ] gate exits 0 and gate 12's numbers drop
- [ ] 0 inline `var()`, 0 raw `<button>`, 0 off-scale icons in this file
- [ ] the nav rows' drag-host attributes and depth are unchanged
- [ ] the tooltips, `aria-label`s and the two `Select`s that P4 added still behave; its
      tests stay green without being weakened
- [ ] the collapsed rail and the expanded rail are both visually on-contract

---

## Shell refactor (S1 / S2 / S3)

`TabHub.dc.html` is the visual spec. These three run concurrently and are file-disjoint.

| phase | owns | verified baseline (var() / raw button / off-scale icon) |
| --- | --- | --- |
| S1 | `src/components/Sidebar.jsx` | 0 / 0 / 0 — already on the contract |
| S2 | `src/components/Toolbar.jsx` | **21** / 0 / 0 |
| S3 | `src/main.jsx`, `src/components/CollectionCard.jsx` | main.jsx **31 / 3** / 0 · CollectionCard 0 / 0 / 0 |

Gate 12 stands at 291 / 42 / 7 / 27. S2 and S3 must lower the ceilings by what they clear.

### The one interface between two phases

The design puts a grid/list segmented control in the header, but the view state belongs to
`App`. S2 owns `Toolbar.jsx` and cannot touch `main.jsx`; S3 owns `main.jsx` and must not
touch `Toolbar.jsx`. They meet at this contract, which both implement independently:

```
Toolbar receives two new OPTIONAL props:
  view          'grid' | 'list'        — defaults to 'grid' when absent
  onViewChange  (next: 'grid'|'list') => void   — optional; the control is inert without it
```

Defaulting matters: it means either phase can merge first and the build still works.

### S1 — sidebar

- logo block: 20px accent tile + wordmark + **total count in mono**, right-aligned
- source switcher keeps the `Select` (behaviour wins) but takes the design's geometry:
  full width, 30px, `rounded-sm`, bordered, muted label
- an "全部收藏" row, then a **`分类` section label** (10px, 600, uppercase-ish tracking,
  `text-faint`), then the folder rows
- folder rows: 30px, `rounded-sm`, icon 12.5px, name flexes, **count in mono `text-faint`**,
  nested folders indent (the design uses 22px vs 8px left padding by depth)
- bottom bar: a bordered segmented control for theme — **keep all three options**
  (system/light/dark), the design only drew two — then a spacer, then 设置
- the collapsed rail keeps its current behaviour and tooltips

### S2 — toolbar

- row 1: search (max 520px, 34px, `rounded-md`, mono `/` kbd inside a bordered chip at the
  right), spacer, the **grid/list segmented control**, then 管理
- row 2: **保存当前标签页 filled with the accent**, a 1px vertical divider, then
  自动整理 / AI 分类 / 失效检测 / 新建分类 as ghost buttons at 30px
- 失效检测 carries a **count badge** in mono on `bg-primary/10 text-primary` when the
  dead-link count is non-zero. The count already exists in `App` — if it is not currently
  passed to `Toolbar`, add an optional prop with the same defaulting rule as above.
- clear all 21 inline `var()` from this file

### S3 — content area and list view

- **sticky group headers**: `position: sticky; top: 0`, page background, bottom border,
  folder icon + name + count in mono + a collapse chevron on the right
- grid: `repeat(auto-fill, minmax(232px, 1fr))` at 8px gap
- **new list view**: one bordered container per group, 36px rows, 18px favicon tile,
  title capped at ~42% width, mono URL flexing, **tags on the right** as small outlined
  chips — this is where `onTagClick` finally gets used again
- clear main.jsx's 31 inline `var()` and its 3 raw `<button>`

**The risk lives here.** Three SortableJS scopes run against this markup and `main.jsx`
reverts Sortable's DOM mutation before React reconciles. In list view the rows must still
carry `data-card-id` and still be **direct children** of `[data-cards-collection-id]`, in
order, or `evt.from.children[oldIndex]` indexes the wrong node. Prove it the way P5a and
P5b did: a rendered-DOM comparison in both views, mutation-checked.


## P6 — Style unification

Runs **after P5a and P5b merge**, in three file-disjoint parts:
**As shipped** (S2 and S3 had already cleared `Toolbar.jsx` and `main.jsx`, so the split
was re-cut on the measured 237): **P6a** `SettingsModal`, `SaveTabsModal`,
`AICategorizeModal`, `EditBookmarkModal` (115) · **P6b** `DeadLinkModal`, `BatchMoveModal`,
`PromptModal`, `ConfirmModal`, `DialogShell` (69) · **P6c** `ChatPanel`, `WelcomeCard`,
`UndoToast`, `ContextMenu` (53). The `src/index.css` alias deletion, the fixture
replacement, the `--ui-scrim`/`--ui-ring` work and the mechanism-E sweep were done by the
integrator after all three merged. The original plan text read: P6a the nine dialogs ·
P6b `Toolbar`, `ChatPanel`, `UndoToast`, `WelcomeCard`, `BookmarkIcon`, `ContextMenu`,
`DialogShell` · P6c `main.jsx` plus the
`src/index.css` cleanup.

Carry-ins from the P5 reviews, to be done inside P6:
- **delete `src/test/fixtures/SidebarP5Baseline.jsx`.** A frozen 384-line copy of a
  component proves something only at the moment of the migration; after that it rots, and
  a drifted copy proves nothing while still costing a rebuild. Replace the
  diff-against-frozen-copy with an inline literal snapshot of `dragHostShape()`'s object —
  same protection, no duplicate component, and a reader checks one literal instead of
  trusting that 384 lines were never touched. Lose no assertion.
- **done (P6a)**, with a correction to this line's own claim: P5b's theme group actually
  uses `role="group" aria-label`, not `aria-labelledby` — no `aria-labelledby` existed in
  `Sidebar.jsx`. P6a used `aria-labelledby`, which is the better of the two (the name is
  the visible text, no duplicated string). The surfaces still differ; align P5b to it later.
- ~~give `SettingsModal`'s "Data" heading the `<div id>` + `role="group" aria-labelledby`
  treatment P5b used for the theme group; right now the two surfaces diverge.
- pick one: `Label` overrides use `leading-none` in `Sidebar.jsx` and `leading-normal` in
  the five P3 files.
- **decided:** a cva-supplied size is not a component-authored size. The typography table
  governs sizes a component writes itself; `<Button size="sm">` carrying `text-xs` beside
  a `text-primary` is the primitive's own scale and is allowed.
- **done:** `src/test/fixtures/SidebarP5Baseline.jsx` is deleted, replaced by a literal
  snapshot dumped from the real render. The `分类` label now sits between the
  all-collections row and the folders, where the design puts it — the SortableJS host moved
  to an inner `<div>` holding only the folder rows, which the S1 review had already proved
  safe. One real drag is on the smoke list for the scroll-parent move.
- **done:** `deadLinkCount` is derived from the last check's dead set reconciled against
  `allCards`, so removal by any path and undo are all correct for free. The maintained
  counter it replaces drifted both ways.

Acceptance:
- [ ] gate 12 reads **0 / 0 / 0 / 0**, and the ceilings in `scripts/verify-ui.sh` are set to 0
- [ ] the legacy alias block is deleted from `src/index.css`; `--ui-*` is the only palette
- [ ] no test was weakened to get there; total count did not drop
- [ ] one visual pass over every surface in the browser, on the smoke list


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

**From the identity-tile change (merged):**
- open a folder with many icon-less bookmarks: every one should now carry its own
  tinted letter tile instead of Chrome's grey globe. The detection compares the bytes
  `/_favicon/` returns against the bytes it returns for an unresolvable host — verify it
  actually fires, since jsdom cannot exercise the endpoint.
- a site with a real favicon must still show it, not a tile
- collapse the sidebar: folder rows should be distinguishable at a glance
- the same site's bookmarks share a tile colour (identity is derived from the host)

**From P5b (merged):**
- nav rows moved from `display:flex` to the Button cva's `inline-flex`. `w-full` keeps one
  row per line, but each row now sits on a line box and may pick up a few px of baseline
  descender space — jsdom cannot see this, so look at the row rhythm.
- the two select triggers grow 34px → 36px and the section labels tighten to `leading-none`
- collapsed-rail **inactive** rows move from `color: inherit` at 60% opacity to a solid
  `text-muted-foreground`

**From P5a (merged):**
- **dark mode, every bookmark card.** Tailwind's `border` sets width only; without a base
  layer it falls back to preflight's `#e5e7eb`, which is invisible against light mode's
  `--ui-border` and a near-white outline in dark. Fixed at the root with shadcn's
  `* { border-color }` base layer and guarded by gate 4 — but eyeball it in dark mode.
- the collection header: clicking the title, the count, the chevron, **and the 12px strip
  above and below them** must all toggle the collection. The drag handle deliberately no
  longer does, and neither does the 16px left gutter.
- "open all" has moved from left of the chevron to the far right of the header
- collection panels are now 8px-cornered, not 16px; cards and drop zones 8px, not 12px
- tag chips are real buttons now, so a long collection adds three tab stops per card —
  check the tab order is not unreasonable

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
