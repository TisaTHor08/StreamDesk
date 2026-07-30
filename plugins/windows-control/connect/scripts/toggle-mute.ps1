param(
  [Parameter(Mandatory)][ValidateSet(0, 1)][int]$DataFlow
)
. "$PSScriptRoot\_audio.ps1"
$muted = Switch-StreamDeskMute -DataFlow $DataFlow
ConvertTo-Json -Compress @{ muted = $muted }
