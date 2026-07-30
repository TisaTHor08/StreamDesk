<#
.SYNOPSIS
    Downloads a portable (zip, no-installer) copy of Node.js for Windows
    into a local folder, without touching any system-wide Node.js install.

.DESCRIPTION
    Used by "Lancer StreamDesk.bat" when the Node.js version found on PATH
    doesn't match the version StreamDesk is tested against. Native addons
    such as better-sqlite3 only ship prebuilt binaries for specific Node
    versions; building from source requires Visual Studio Build Tools,
    which most machines don't have. Downloading a known-good portable
    Node avoids that entirely, requires no admin rights, and never
    touches any Node.js the user already has installed elsewhere.

.PARAMETER Major
    Node.js major version to install (e.g. 22).

.PARAMETER DestDir
    Folder to install into. Wiped and recreated if it already exists.
#>
param(
    [int]$Major = 22,
    [string]$DestDir = ".tools\node"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "==> Recherche de la derniere version Node.js $Major.x..." -ForegroundColor Cyan
$index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json"
$release = $index |
    Where-Object { $_.version -match "^v$Major\." } |
    Sort-Object { [version]($_.version.TrimStart('v')) } -Descending |
    Select-Object -First 1

if (-not $release) {
    Write-Error "Aucune version Node.js $Major.x trouvee sur nodejs.org."
    exit 1
}

$version = $release.version
Write-Host "    Version retenue : $version"

$zipUrl = "https://nodejs.org/dist/$version/node-$version-win-x64.zip"
$zipPath = Join-Path $env:TEMP "streamdesk-node-$version.zip"

Write-Host "==> Telechargement de $zipUrl" -ForegroundColor Cyan
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

if (Test-Path $DestDir) {
    Remove-Item -Recurse -Force $DestDir
}
New-Item -ItemType Directory -Path $DestDir -Force | Out-Null

Write-Host "==> Extraction..." -ForegroundColor Cyan
$extractTmp = Join-Path $env:TEMP "streamdesk-node-extract-$version"
if (Test-Path $extractTmp) { Remove-Item -Recurse -Force $extractTmp }
Expand-Archive -Path $zipPath -DestinationPath $extractTmp -Force

# The zip contains a single top-level folder (e.g. node-v22.19.0-win-x64\);
# flatten its contents so that $DestDir\node.exe exists directly.
$inner = Get-ChildItem -Path $extractTmp -Directory | Select-Object -First 1
Get-ChildItem -Path $inner.FullName | Move-Item -Destination $DestDir -Force

Remove-Item -Force $zipPath
Remove-Item -Recurse -Force $extractTmp

if (Test-Path (Join-Path $DestDir "node.exe")) {
    Write-Host "==> Node.js $version installe dans $DestDir" -ForegroundColor Green
    exit 0
} else {
    Write-Error "L'extraction a echoue : node.exe introuvable dans $DestDir"
    exit 1
}
