# TabHub

> 📦 **[安装与使用（Windows / Mac / Linux 新手安装指南）](./docs/INSTALL.md)** — 不懂开发也能照着从零安装、加载和更新 TabHub。

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

## Development sync (Mac / Windows / Linux)

Use these scripts to pull the **current branch**, install deps only when needed, and rebuild `dist/` so Chrome can reload the unpacked extension. They refuse only when **tracked** files have uncommitted changes (`git status --porcelain --untracked-files=no`); untracked files are ignored. They never stash or reset.

### First-time load

1. Clone the repo and check out the branch you want (usually `main`).
2. `npm install` (or `npm ci`) once, then `npm run build`.
3. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this repo's `dist/` folder.

### Daily sync

Keep the extension pointing at the same `dist/` folder. From the repo root (tracked files must have no uncommitted changes; untracked files are fine):

```bash
# Mac / Linux
./scripts/sync.sh
```

```powershell
# Windows (PowerShell), or double-click scripts/sync.cmd
.\scripts\sync.ps1
```

What the script does:

1. Aborts if tracked files have uncommitted changes (untracked files do not block).
2. `git fetch` then `git pull --ff-only` on the **current branch** (does not switch you to `main`).
3. Runs `npm ci` when `node_modules` is missing, or when `package-lock.json` differs from `node_modules/.package-lock.json` (missing counts as differ).
4. Runs `npm run build`.
5. Prints the manifest version and short git SHA, then reminds you to reload at `chrome://extensions`.

After a successful sync, open `chrome://extensions` and click **Reload** on TabHub.

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

## 本地开发与测试命令

以下命令均在仓库根目录执行。

```bash
npm ci                      # 按 package-lock.json 安装依赖（干净、可复现）
npm run dev                 # 启动 Vite 开发服务器
npm run lint                # ESLint 检查 src/
npm run lint:fix            # ESLint 自动修复 src/
npm test                    # Vitest 单元/组件测试（单次运行）
npm run test:watch          # Vitest 监听模式，改文件即重跑
npm run build               # 生产构建，产物输出到 dist/
bash scripts/verify-ui.sh    # UI 验收门禁（12 项检查）
```

- **`npm ci`** — 安装依赖。首次克隆或 `package-lock.json` 变化时使用；它严格按锁文件安装并清空既有 `node_modules`，比 `npm install` 更适合 CI 与复现问题。
- **`npm run dev`** — 启动 Vite 开发服务器（热更新）。调试扩展本体时仍需 `npm run build` 后在 `chrome://extensions` 加载 `dist/`。
- **`npm run lint` / `npm run lint:fix`** — 前者只报告问题，后者自动修复可修复项；提交前应确保 `lint` 通过。
- **`npm test` / `npm run test:watch`** — 运行 Vitest 测试套件；改代码时用 watch 模式更快拿到反馈。
- **`npm run build`** — 生产构建，输出到 `dist/`，供 Chrome「加载已解压的扩展程序」使用。
- **`bash scripts/verify-ui.sh`** — UI 验收门禁，覆盖单元测试、lint、生产构建、设计 token 层、SortableJS DOM 约束、i18n、打包体积与样式棘轮等 12 项检查。任何 UI 改动提交前必须让它以退出码 0 结束（输出 `ALL GATES PASSED`）。
