#!/usr/bin/env bash
# One-click TabHub extension sync: pull current branch → npm ci (if needed) → build.
# Run from anywhere; resolves to the repo root via this script's location.
# Refuses when tracked files have staged/unstaged changes (`git status --porcelain --untracked-files=no`). Untracked files are ignored. Does not stash or reset.
set -euo pipefail

cd "$(dirname "$0")/.."

die() {
  printf 'sync: ERROR: %s\n' "$*" >&2
  exit 1
}

info() {
  printf 'sync: %s\n' "$*"
}

# Require a git repo; refuse only when tracked files have staged/unstaged changes.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not inside a git repository"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  printf 'sync: ERROR: tracked files have uncommitted changes. Commit, stash, or discard them first.\n' >&2
  git status --porcelain --untracked-files=no >&2
  exit 1
fi

branch=$(git rev-parse --abbrev-ref HEAD)
info "branch: $branch"

before_sha=$(git rev-parse HEAD)
if [ -f package-lock.json ]; then
  before_lock=$(git hash-object package-lock.json)
else
  before_lock=""
fi

info "git fetch"
git fetch || die "git fetch failed"

info "git pull --ff-only"
if ! git pull --ff-only; then
  die "git pull --ff-only failed (non-fast-forward or network error). Resolve manually, then re-run."
fi

after_sha=$(git rev-parse HEAD)
if [ -f package-lock.json ]; then
  after_lock=$(git hash-object package-lock.json)
else
  after_lock=""
fi

need_ci=0
if [ ! -d node_modules ]; then
  info "node_modules missing → will run npm ci"
  need_ci=1
elif [ "$before_lock" != "$after_lock" ]; then
  info "package-lock.json changed ($before_sha → $after_sha) → will run npm ci"
  need_ci=1
else
  info "package-lock.json unchanged and node_modules present → skip npm ci"
fi

if [ "$need_ci" -eq 1 ]; then
  info "npm ci"
  npm ci || die "npm ci failed"
fi

info "npm run build"
npm run build || die "npm run build failed"

version="?"
if [ -f dist/manifest.json ]; then
  version=$(node -pe 'JSON.parse(require("fs").readFileSync("dist/manifest.json","utf8")).version' 2>/dev/null || echo "?")
elif [ -f public/manifest.json ]; then
  version=$(node -pe 'JSON.parse(require("fs").readFileSync("public/manifest.json","utf8")).version' 2>/dev/null || echo "?")
fi
short_sha=$(git rev-parse --short HEAD)

printf '\n'
info "build OK — manifest version ${version}, git ${short_sha}"
info "Reload the extension at chrome://extensions (click the reload icon on TabHub)."
