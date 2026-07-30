param(
  [Parameter(Mandatory)][string]$Text
)
Set-Clipboard -Value $Text
ConvertTo-Json -Compress @{ ok = $true }
