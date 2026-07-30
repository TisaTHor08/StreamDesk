<#
.SYNOPSIS
    StreamDesk — Windows development uninstall/cleanup script.

.DESCRIPTION
    Removes node_modules and dist/ build output across the workspace, and
    optionally the local SQLite data directory. Nothing is deleted without
    an explicit confirmation prompt (or -Force).

.PARAMETER RepoPath
    Path to the StreamDesk repo checkout. Defaults to the current directory.

.PARAMETER Force
    Skip the confirmation prompt.

.PARAMETER IncludeData
    Also remove apps/server/data (the SQLite database and plugin storage).
    Off by default — this is your data.
#>
param(
    [string]$RepoPath = (Get-Location).Path,
    [switch]$Force,
    [switch]$IncludeData
)

$ErrorActionPreference = "Stop"
Push-Location $RepoPath
try {
    $targets = Get-ChildItem -Recurse -Directory -Include "node_modules", "dist" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "\\node_modules\\.*\\node_modules" }

    if ($IncludeData) {
        $dataDir = Join-Path $RepoPath "apps\server\data"
        if (Test-Path $dataDir) { $targets += Get-Item $dataDir }
    }

    if ($targets.Count -eq 0) {
        Write-Host "Nothing to remove."
        return
    }

    Write-Host "The following directories will be removed:" -ForegroundColor Yellow
    $targets | ForEach-Object { Write-Host "  $($_.FullName)" }

    if (-not $Force) {
        $confirm = Read-Host "Type 'yes' to confirm"
        if ($confirm -ne "yes") {
            Write-Host "Aborted."
            return
        }
    }

    foreach ($t in $targets) {
        Remove-Item -Recurse -Force $t.FullName
    }
    Write-Host "==> Done." -ForegroundColor Green
} finally {
    Pop-Location
}
