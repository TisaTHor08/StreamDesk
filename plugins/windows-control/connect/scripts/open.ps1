<#
  Opens a file, folder, executable, or URL with whatever the OS considers
  its default handler (same effect as double-clicking it, or typing it into
  Run). Deliberately does NOT accept a raw shell command line — only a
  single path/URL and an optional argument string passed straight through
  to the target program, never interpreted by a shell — see
  docs/architecture/security.md's "no arbitrary system command" rule.
#>
param(
  [Parameter(Mandatory)][string]$Path,
  [string]$Args
)
try {
  if ($Args) {
    Start-Process -FilePath $Path -ArgumentList $Args -ErrorAction Stop
  } else {
    Start-Process -FilePath $Path -ErrorAction Stop
  }
  ConvertTo-Json -Compress @{ opened = $true }
} catch {
  Write-Error $_
  exit 1
}
