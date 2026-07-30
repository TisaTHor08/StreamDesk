<#
  Enables/disables/toggles the wireless network adapter. Requires the
  Connect process to run elevated (Administrator) — Enable-NetAdapter /
  Disable-NetAdapter both fail with an access-denied error otherwise. If
  this action errors out, that's the first thing to check.
#>
param(
  [Parameter(Mandatory)][ValidateSet("enable", "disable", "toggle")][string]$Mode
)

$adapter = Get-NetAdapter -ErrorAction SilentlyContinue |
  Where-Object { $_.InterfaceDescription -match "Wireless|Wi-?Fi|802\.11|WLAN" } |
  Select-Object -First 1

if (-not $adapter) {
  Write-Error "Aucun adaptateur Wi-Fi trouvé sur cette machine."
  exit 1
}

$targetEnabled = switch ($Mode) {
  "enable" { $true }
  "disable" { $false }
  "toggle" { $adapter.Status -ne "Up" }
}

try {
  if ($targetEnabled) {
    Enable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction Stop
  } else {
    Disable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction Stop
  }
  ConvertTo-Json -Compress @{ enabled = $targetEnabled }
} catch {
  Write-Error "Échec (droits administrateur requis pour activer/désactiver un adaptateur réseau) : $_"
  exit 1
}
