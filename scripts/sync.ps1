# One-click TabHub extension sync (Windows): pull current branch → npm ci (if needed) → build.
# Run via scripts/sync.cmd or: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync.ps1
# Refuses a dirty worktree (any `git status --porcelain` output). Does not stash or reset.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Die([string]$Message) {
  Write-Error "sync: ERROR: $Message"
  exit 1
}

function Info([string]$Message) {
  Write-Host "sync: $Message"
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $RepoRoot

try {
  git rev-parse --is-inside-work-tree 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { Die 'not inside a git repository' }
} catch {
  Die 'not inside a git repository'
}

$porcelain = git status --porcelain
if ($LASTEXITCODE -ne 0) { Die 'git status failed' }
if (-not [string]::IsNullOrWhiteSpace($porcelain)) {
  Write-Host 'sync: ERROR: working tree is not clean. Commit, stash, or discard changes first.' -ForegroundColor Red
  Write-Host $porcelain
  exit 1
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Info "branch: $branch"

$beforeSha = (git rev-parse HEAD).Trim()
$beforeLock = $null
if (Test-Path -LiteralPath 'package-lock.json') {
  $beforeLock = (git hash-object package-lock.json).Trim()
}

Info 'git fetch'
git fetch
if ($LASTEXITCODE -ne 0) { Die 'git fetch failed' }

Info 'git pull --ff-only'
git pull --ff-only
if ($LASTEXITCODE -ne 0) {
  Die 'git pull --ff-only failed (non-fast-forward or network error). Resolve manually, then re-run.'
}

$afterSha = (git rev-parse HEAD).Trim()
$afterLock = $null
if (Test-Path -LiteralPath 'package-lock.json') {
  $afterLock = (git hash-object package-lock.json).Trim()
}

$needCi = $false
if (-not (Test-Path -LiteralPath 'node_modules')) {
  Info 'node_modules missing → will run npm ci'
  $needCi = $true
} elseif ($beforeLock -ne $afterLock) {
  Info "package-lock.json changed ($beforeSha → $afterSha) → will run npm ci"
  $needCi = $true
} else {
  Info 'package-lock.json unchanged and node_modules present → skip npm ci'
}

if ($needCi) {
  Info 'npm ci'
  npm ci
  if ($LASTEXITCODE -ne 0) { Die 'npm ci failed' }
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
Info "build OK — manifest version $version, git $shortSha"
Info 'Reload the extension at chrome://extensions (click the reload icon on TabHub).'
