param(
  [Parameter(Mandatory)][ValidateSet(0, 1)][int]$DataFlow,
  [Parameter(Mandatory)][double]$Level
)
. "$PSScriptRoot\_audio.ps1"
$result = Set-StreamDeskVolume -DataFlow $DataFlow -Level $Level
ConvertTo-Json -Compress @{ level = $result }
