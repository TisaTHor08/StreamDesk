<#
.SYNOPSIS
    StreamDesk — Windows development install script.

.DESCRIPTION
    Sets up a StreamDesk checkout for local development/testing on
    Windows: verifies Node.js, enables pnpm via Corepack, and installs
    workspace dependencies. Does not build an installer or a Windows
    service — see README.md's "Autostart" section for that.

.PARAMETER RepoPath
    Path to the StreamDesk repo checkout. Defaults to the current directory.
#>
param(
    [string]$RepoPath = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

Write-Host "==> Checking Node.js" -ForegroundColor Cyan
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js was not found on PATH. Install Node.js 20 LTS from https://nodejs.org/ first."
    exit 1
}
$nodeVersion = node -v
Write-Host "    Found $nodeVersion"

Write-Host "==> Enabling pnpm via Corepack" -ForegroundColor Cyan
corepack enable
corepack prepare pnpm@9.7.0 --activate

Push-Location $RepoPath
try {
    Write-Host "==> Installing workspace dependencies (pnpm install)" -ForegroundColor Cyan
    pnpm install

    Write-Host ""
    Write-Host "==> Done. Next steps:" -ForegroundColor Green
    Write-Host "    pnpm dev            # runs Server + Connect + Interface together"
    Write-Host "    pnpm dev:server     # or run them individually"
    Write-Host "    pnpm dev:connect"
    Write-Host "    pnpm dev:interface"
} finally {
    Pop-Location
}
