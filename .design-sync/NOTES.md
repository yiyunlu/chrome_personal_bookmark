# design-sync notes — TabHub

- First sync 2026-09-13. Shape `package`, **synth-entry**: this repo is a Chrome extension, not a library — no `main`/`module`/`exports`, `vite build` emits an app bundle. The converter reads `src/components/ui/` directly (`srcDir`), so only the vendored shadcn primitives sync; app screens (`Sidebar`, `Toolbar`, `CollectionCard`, the modals) are deliberately out — they take app state and `BookmarkIcon` fetches `/_favicon/`, so they cannot render in the design runtime.
- No TypeScript: `.d.ts` props come from the synth scan and are thin. Hand-written `dtsPropsFor` entries are the fix where the design agent needs the real API.
- Path alias `@/lib/cn` is used by every primitive; `tsconfig` points at `jsconfig.json` (same `compilerOptions.paths` shape).
- The synced stylesheet is NOT the extension's own build output. The extension build purges every utility TabHub itself does not use — right for the extension, wrong for a design system (63% of the bg/text/border × token matrix and every `hover:` variant were missing). `tailwind.sync.config.js` extends the app config with a safelist of the full token matrix (plain + hover + focus-visible, alphas ''/10/15/40) and `buildCmd` compiles `src/index.css` through it to `dist/assets/tabhub.css`. That config is consumed only here, never by the extension build.
- Tailwind CLI does not rewrite asset URLs the way Vite does, so the `@font-face` `url('./fonts/…')` rules in `tabhub.css` resolve relative to `dist/assets/`. `buildCmd` copies `src/fonts/*.woff2` to `dist/assets/fonts/` for that reason; no `extraFonts` needed — the CSS's own rules are harvested.
- Fonts: IBM Plex Sans/Mono woff2 are bundled under `src/fonts/` (latin + latin-ext). CJK falls through to the system face on purpose; `[FONT_MISSING]` for Noto Sans SC is expected — do not resolve it by bundling a multi-megabyte CJK face.
- `npm ci` was NOT re-run before the first sync: `node_modules` had just been verified consistent with `package-lock.json` (`npm ls` clean) and had been building all session.
- Node 26.7 / npm 11.19; no `.nvmrc` or `engines`.

## How the build is invoked (and why it looks odd)

- `entry` is `./dist/index.es.js`, **a path that does not exist on purpose.** The converter locates the package root by walking up from `--entry` to the nearest named `package.json`; without it, it looks in `node_modules/tabhub`, which a private app never has. Because the file is absent and the package adapter resolves it with `soft: true`, the converter falls through to **synth-entry**: it generates `ds-bundle/.pkg-entry.mjs` re-exporting every `.jsx` under `srcDir` and derives the component list from those exports (81 as of the first sync). Pointing `entry` at a REAL file (e.g. `button.jsx`) breaks this — it is then treated as the built entry, the bundle exports only that file, and discovery falls back to the (empty) `.d.ts` tree → `[ZERO_MATCH]`.
- `@types/react` is needed by the `.d.ts` extractor but must NOT be added to the repo's `package.json` (converter deps stay isolated in `.ds-sync/`). Fresh-clone setup: `mkdir -p node_modules/@types && ln -s ../../.ds-sync/node_modules/@types/react node_modules/@types/react` after the `.ds-sync` install. `node_modules` is gitignored, so the link never commits.
- Playwright + chromium are installed under `.ds-sync/` too (`npm i playwright && npx playwright install chromium` there); validate imports `playwright` relative to its own location, so that is where it resolves.

## Previews (first sync, 2026-09-13)

- 79/81 components have authored previews in `.design-sync/previews/`; only `SelectScrollUpButton` / `SelectScrollDownButton` stay on the floor card (they throw outside `SelectContent` and only appear when the list overflows - nothing static to show).
- Sub-parts (Card*, Select*, Dialog*, AlertDialog*, DropdownMenu*, ContextMenu*, Tooltip*) each carry the SAME full-composition story as their root - a sub-part rendered alone is an empty box and the validator flags it `[RENDER_BLANK]`. The family files are generated from one template; edit the root and re-copy.
- Overlay families are `cardMode: single` with a declared viewport (`cfg.overrides`, 64 entries). Dialog/AlertDialog stories keep shadcn's fixed+centered content (the single-mode wrapper's transform contains it) and reserve height with a sized spacer div; forcing `position: relative` on the content pushes it below the spacer instead.
- `ContextMenu` has no controlled `open`: the story dispatches a real `contextmenu` MouseEvent on its trigger 50ms after mount. Sub-menus (hover-only) are not shown.
- `Toaster`: sonner's store is module-level, so a preview importing `'sonner'` gets a second copy and never shows a toast. `cfg.extraEntries: ["./.design-sync/entries/toast.js"]` merges `toast` onto `window.TabHub`; the preview (and designs) use `window.TabHub.toast`.
- Sonner's default position math inside the transformed wrapper lands the toast top-right in the card; harmless.

## Known render warns

- (none on the final run - 81/81 clean, 0 thin, 0 variants-identical)

## Re-sync risks

- `.design-sync/config.json` `overrides` must stay in step with the preview files: a new overlay preview without `cardMode: single` renders its portal outside the card.
- The `@types/react` symlink in `node_modules` and the `.ds-sync/` playwright install (chromium-1243) are machine-local; on a fresh clone re-run the dep install, re-create the symlink, and re-install playwright 1.63 before the render check.
- `tailwind.sync.config.js` safelists the classes the previews use; a preview that uses a token class outside the safelist will render unstyled - extend the safelist, not the preview.
- The extraEntries file (`.design-sync/entries/toast.js`) is part of the shipped bundle; removing it silently breaks the Toaster preview and any design using `toast`.
