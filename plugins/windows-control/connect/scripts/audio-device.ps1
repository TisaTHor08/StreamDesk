<#
  Enables/disables an audio endpoint device (headset, microphone, speakers,
  ...) at the Device Manager level, matched by a case-insensitive substring
  of its friendly name — configurable per button since hardware names vary
  (e.g. "Casque", "Headset", the exact model name...). Requires the Connect
  process to run elevated (Administrator).
#>
param(
  [Parameter(Mandatory)][string]$NameContains,
  [Parameter(Mandatory)][ValidateSet("enable", "disable", "toggle")][string]$Mode
)

$device = Get-PnpDevice -Class AudioEndpoint -ErrorAction SilentlyContinue |
  Where-Object { $_.FriendlyName -like "*$NameContains*" } |
  Select-Object -First 1

if (-not $device) {
  Write-Error "Aucun périphérique audio dont le nom contient « $NameContains »."
  exit 1
}

$targetEnabled = switch ($Mode) {
  "enable" { $true }
  "disable" { $false }
  "toggle" { $device.Status -ne "OK" }
}

try {
  if ($targetEnabled) {
    Enable-PnpDevice -InstanceId $device.InstanceId -Confirm:$false -ErrorAction Stop
  } else {
    Disable-PnpDevice -InstanceId $device.InstanceId -Confirm:$false -ErrorAction Stop
  }
  ConvertTo-Json -Compress @{ enabled = $targetEnabled; deviceName = $device.FriendlyName }
} catch {
  Write-Error "Échec (droits administrateur requis) : $_"
  exit 1
}
