<#
  Sets the internal display's brightness via the WmiMonitorBrightnessMethods
  WMI class (root\wmi namespace). This only works for the built-in panel on
  most laptops — external monitors generally need DDC/CI, which this does
  not implement (out of scope; would need a dedicated DDC/CI library).
#>
param(
  [Parameter(Mandatory)][double]$Level
)
$clamped = [byte][Math]::Max(0, [Math]::Min(100, [Math]::Round($Level)))
try {
  $methods = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop
  foreach ($m in $methods) {
    Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{ Timeout = [uint32]1; Brightness = $clamped } | Out-Null
  }
  ConvertTo-Json -Compress @{ level = [int]$clamped }
} catch {
  Write-Error "Impossible de régler la luminosité (écran interne uniquement) : $_"
  exit 1
}
