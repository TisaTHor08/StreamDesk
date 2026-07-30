param(
  [Parameter(Mandatory)][ValidateSet("lock", "sleep", "shutdown", "restart", "signOut")][string]$Mode,
  [int]$DelaySeconds = 0
)

switch ($Mode) {
  "lock" {
    rundll32.exe user32.dll,LockWorkStation
  }
  "sleep" {
    rundll32.exe powrprof.dll,SetSuspendState 0,1,0
  }
  "shutdown" {
    shutdown.exe /s /t $DelaySeconds
  }
  "restart" {
    shutdown.exe /r /t $DelaySeconds
  }
  "signOut" {
    # shutdown.exe /l does not support a delay; sign-out is immediate.
    shutdown.exe /l
  }
}
ConvertTo-Json -Compress @{ ok = $true; mode = $Mode }
