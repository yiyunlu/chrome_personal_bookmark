# One-click TabHub extension sync (Windows): pull current branch -> npm ci (if needed) -> build.
# Run via scripts/sync.cmd or: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync.ps1
# Refuses when tracked files have staged/unstaged changes (`git status --porcelain --untracked-files=no`). Untracked files are ignored. Does not stash or reset.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Die([string]$Message) {
  Write-Error "sync: ERROR: $Message"
  exit 1
}

function Info([string]$Message) {
  Write-Host "sync: $Message"
}

function Test-LockfilesMatch {
  $rootLock = 'package-lock.json'
  $nmLock = Join-Path 'node_modules' '.package-lock.json'
  if (-not (Test-Path -LiteralPath $rootLock)) { return $false }
  if (-not (Test-Path -LiteralPath $nmLock)) { return $false }
  $hashRoot = (Get-FileHash -LiteralPath $rootLock -Algorithm SHA256).Hash
  $hashNm = (Get-FileHash -LiteralPath $nmLock -Algorithm SHA256).Hash
  return ($hashRoot -eq $hashNm)
}

function Stamp-NodeModulesLock {
  # Freshness stamp: copy root lock over node_modules/.package-lock.json.
  # npm's own hidden lockfile is a filtered install snapshot and is never a byte
  # match for the root lock — without the copy, "lockfiles match -> skip" never fires.
  Copy-Item -LiteralPath 'package-lock.json' -Destination (Join-Path 'node_modules' '.package-lock.json') -Force
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

try {
  git rev-parse --is-inside-work-tree 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { Die 'not inside a git repository' }
} catch {
  Die 'not inside a git repository'
}

$porcelain = git status --porcelain --untracked-files=no
if ($LASTEXITCODE -ne 0) { Die 'git status failed' }
if (-not [string]::IsNullOrWhiteSpace($porcelain)) {
  Write-Host 'sync: ERROR: tracked files have uncommitted changes. Commit, stash, or discard them first.' -ForegroundColor Red
  Write-Host $porcelain
  exit 1
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Info "branch: $branch"

Info 'git fetch'
git fetch
if ($LASTEXITCODE -ne 0) { Die 'git fetch failed' }

Info 'git pull --ff-only'
git pull --ff-only
if ($LASTEXITCODE -ne 0) {
  Die 'git pull --ff-only failed (non-fast-forward or network error). Resolve manually, then re-run.'
}

# Reinstall when node_modules is missing or its lock snapshot is stale/missing.
# Do not rely on whether *this* script's pull changed package-lock.json (external pulls
# or an outdated install would otherwise skip npm ci and break builds, e.g. missing vite).
$needCi = $false
if (-not (Test-Path -LiteralPath 'node_modules')) {
  Info 'node_modules missing -> npm ci'
  $needCi = $true
} elseif (-not (Test-LockfilesMatch)) {
  Info 'package-lock.json differs from node_modules/.package-lock.json -> npm ci'
  $needCi = $true
} else {
  Info 'lockfiles match -> skip npm ci'
}

if ($needCi) {
  Info 'npm ci'
  npm ci
  if ($LASTEXITCODE -ne 0) { Die 'npm ci failed' }
  Stamp-NodeModulesLock
}

Info 'npm run build'
npm run build
if ($LASTEXITCODE -ne 0) { Die 'npm run build failed' }

$version = '?'
$manifestPath = $null
if (Test-Path -LiteralPath 'dist/manifest.json') {
  $manifestPath = 'dist/manifest.json'
} elseif (Test-Path -LiteralPath 'public/manifest.json') {
  $manifestPath = 'public/manifest.json'
}
if ($manifestPath) {
  try {
    $version = (Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json).version
  } catch {
    $version = '?'
  }
}
$shortSha = (git rev-parse --short HEAD).Trim()

Write-Host ''
Info "build OK - manifest version $version, git $shortSha"
Info 'Reload the extension at chrome://extensions (click the reload icon on TabHub).'
