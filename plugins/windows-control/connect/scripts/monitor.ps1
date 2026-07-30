<#
  Long-running loop that gathers every "live" data source this plugin
  publishes and writes one compact JSON object per line to stdout. Runs as
  a single persistent process (spawned once when the plugin activates)
  rather than one new powershell.exe per metric per tick — spawning a
  process is the expensive part of shelling out on Windows, so this keeps
  overhead to one process for everything instead of ~10.

  connect/index.js reads this line-by-line and publishes each field as its
  own data source. A field is omitted (left out of the JSON object, not set
  to null) when it couldn't be read this tick, so a single flaky metric
  never blanks out the others.
#>
param(
  [int]$IntervalMs = 2000
)

. "$PSScriptRoot\_audio.ps1"

if (-not ("StreamDesk.ActiveWindow" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
namespace StreamDesk {
    public class ActiveWindow {
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
        [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    }
}
"@
}

function Get-ActiveWindowInfo {
  try {
    $hwnd = [StreamDesk.ActiveWindow]::GetForegroundWindow()
    if ($hwnd -eq [IntPtr]::Zero) { return $null }
    $sb = New-Object System.Text.StringBuilder 512
    [StreamDesk.ActiveWindow]::GetWindowText($hwnd, $sb, 512) | Out-Null
    $procId = 0
    [StreamDesk.ActiveWindow]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    return @{ title = $sb.ToString(); processName = if ($proc) { $proc.ProcessName } else { $null } }
  } catch { return $null }
}

function Get-RunningAppNames {
  try {
    return @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -ExpandProperty ProcessName -Unique)
  } catch { return @() }
}

function Get-CpuUsage {
  try { return [Math]::Round((Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction Stop).CounterSamples[0].CookedValue, 1) }
  catch { return $null }
}

function Get-GpuUsage {
  try {
    $samples = (Get-Counter '\GPU Engine(*engtype_3D)\Utilization Percentage' -ErrorAction Stop).CounterSamples
    $sum = ($samples | Measure-Object -Property CookedValue -Sum).Sum
    if ($null -eq $sum) { return $null }
    return [Math]::Round([Math]::Min(100, $sum), 1)
  } catch { return $null }
}

function Get-RamUsage {
  try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    return [Math]::Round((1 - ($os.FreePhysicalMemory / $os.TotalVisibleMemorySize)) * 100, 1)
  } catch { return $null }
}

function Get-DiskUsage {
  try {
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'" -ErrorAction Stop
    return [Math]::Round((1 - ($disk.FreeSpace / $disk.Size)) * 100, 1)
  } catch { return $null }
}

function Get-Brightness {
  try {
    $b = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightness -ErrorAction Stop | Select-Object -First 1
    if ($b) { return [int]$b.CurrentBrightness }
    return $null
  } catch { return $null }
}

function Get-WifiInfo {
  try {
    $adapter = Get-NetAdapter -ErrorAction SilentlyContinue |
      Where-Object { $_.InterfaceDescription -match "Wireless|Wi-?Fi|802\.11|WLAN" } |
      Select-Object -First 1
    if (-not $adapter) { return @{ enabled = $null; connected = $null; ssid = $null } }

    $enabled = $adapter.Status -eq "Up"
    $ssid = $null
    if ($enabled) {
      $lines = netsh wlan show interfaces 2>$null
      $match = $lines | Select-String -Pattern '^\s*SSID\s*:\s*(.+)$' | Select-Object -First 1
      if ($match) { $ssid = $match.Matches[0].Groups[1].Value.Trim() }
    }
    return @{ enabled = $enabled; connected = [bool]$ssid; ssid = $ssid }
  } catch { return @{ enabled = $null; connected = $null; ssid = $null } }
}

while ($true) {
  $out = @{}

  $win = Get-ActiveWindowInfo
  if ($win) { $out."windows.activeWindow.title" = $win.title; $out."windows.activeWindow.processName" = $win.processName }

  $out."windows.runningApps" = Get-RunningAppNames

  $vol = Get-StreamDeskVolume -DataFlow 0
  if ($null -ne $vol) { $out."windows.audio.volume" = $vol }
  $muted = Get-StreamDeskMute -DataFlow 0
  if ($null -ne $muted) { $out."windows.audio.muted" = $muted }

  $micVol = Get-StreamDeskVolume -DataFlow 1
  if ($null -ne $micVol) { $out."windows.mic.volume" = $micVol }
  $micMuted = Get-StreamDeskMute -DataFlow 1
  if ($null -ne $micMuted) { $out."windows.mic.muted" = $micMuted }

  $brightness = Get-Brightness
  if ($null -ne $brightness) { $out."windows.brightness" = $brightness }

  $wifi = Get-WifiInfo
  if ($null -ne $wifi.enabled) { $out."windows.wifi.enabled" = $wifi.enabled }
  if ($null -ne $wifi.connected) { $out."windows.wifi.connected" = $wifi.connected }
  if ($null -ne $wifi.ssid) { $out."windows.wifi.ssid" = $wifi.ssid }

  $cpu = Get-CpuUsage
  if ($null -ne $cpu) { $out."windows.system.cpuUsage" = $cpu }
  $gpu = Get-GpuUsage
  if ($null -ne $gpu) { $out."windows.system.gpuUsage" = $gpu }
  $ram = Get-RamUsage
  if ($null -ne $ram) { $out."windows.system.ramUsage" = $ram }
  $disk = Get-DiskUsage
  if ($null -ne $disk) { $out."windows.system.diskUsage" = $disk }

  Write-Output (ConvertTo-Json -Compress $out)

  Start-Sleep -Milliseconds $IntervalMs
}
