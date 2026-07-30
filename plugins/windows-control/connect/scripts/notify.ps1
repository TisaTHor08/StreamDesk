<#
  Shows a classic tray balloon notification (System.Windows.Forms.NotifyIcon)
  rather than a modern Action Center toast — toasts need an AUMID
  registration to display reliably when triggered from a script/unpackaged
  process, which is its own rabbit hole; the balloon tip works everywhere
  with zero setup. Intentionally sleeps a few seconds before exiting: the
  tray icon (and its balloon) disappears the instant this process exits, so
  ending immediately after ShowBalloonTip would often mean the notification
  never gets a chance to actually render.
#>
param(
  [Parameter(Mandatory)][string]$Title,
  [Parameter(Mandatory)][string]$Message
)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$icon = New-Object System.Windows.Forms.NotifyIcon
try {
  $icon.Icon = [System.Drawing.SystemIcons]::Information
  $icon.Visible = $true
  $icon.BalloonTipTitle = $Title
  $icon.BalloonTipText = $Message
  $icon.ShowBalloonTip(4000)
  Start-Sleep -Seconds 3
} finally {
  $icon.Visible = $false
  $icon.Dispose()
}
ConvertTo-Json -Compress @{ ok = $true }
