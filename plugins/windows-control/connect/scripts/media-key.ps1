<#
  Simulates a hardware media key press via user32.dll's keybd_event — the
  same mechanism a real multimedia keyboard uses, so it reaches whichever
  app currently owns the system media session (Spotify, browser, etc.)
  without needing to know which one that is.
#>
param(
  [Parameter(Mandatory)][ValidateSet("playPause", "next", "previous", "stop")][string]$Key
)

if (-not ("StreamDesk.Keyboard" -as [type])) {
  Add-Type @"
using System.Runtime.InteropServices;
namespace StreamDesk {
    public class Keyboard {
        [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);
    }
}
"@
}

$vk = switch ($Key) {
  "playPause" { 0xB3 }
  "next" { 0xB0 }
  "previous" { 0xB1 }
  "stop" { 0xB2 }
}

[StreamDesk.Keyboard]::keybd_event([byte]$vk, 0, 0, [System.UIntPtr]::Zero)        # key down
[StreamDesk.Keyboard]::keybd_event([byte]$vk, 0, 2, [System.UIntPtr]::Zero)        # key up (KEYEVENTF_KEYUP)

ConvertTo-Json -Compress @{ ok = $true }
