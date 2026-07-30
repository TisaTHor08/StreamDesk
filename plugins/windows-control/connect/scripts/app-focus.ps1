param(
  [Parameter(Mandatory)][string]$ProcessName
)

if (-not ("StreamDesk.WindowFocus" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
namespace StreamDesk {
    public class WindowFocus {
        [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    }
}
"@
}

$proc = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) {
  ConvertTo-Json -Compress @{ focused = $false; reason = "not-found" }
  exit 0
}

if ([StreamDesk.WindowFocus]::IsIconic($proc.MainWindowHandle)) {
  # SW_RESTORE = 9
  [StreamDesk.WindowFocus]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
}
$ok = [StreamDesk.WindowFocus]::SetForegroundWindow($proc.MainWindowHandle)
ConvertTo-Json -Compress @{ focused = [bool]$ok }
