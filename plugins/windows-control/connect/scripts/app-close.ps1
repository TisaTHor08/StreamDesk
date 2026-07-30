param(
  [Parameter(Mandatory)][string]$ProcessName
)
$procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
if (-not $procs) {
  ConvertTo-Json -Compress @{ closed = $false; reason = "not-found" }
  exit 0
}
$procs | Stop-Process -Force -ErrorAction SilentlyContinue
ConvertTo-Json -Compress @{ closed = $true; count = @($procs).Count }
