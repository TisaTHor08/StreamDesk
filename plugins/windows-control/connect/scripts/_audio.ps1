<#
  Dot-sourced helper: minimal Windows Core Audio API bindings
  (IAudioEndpointVolume via IMMDeviceEnumerator/IMMDevice), compiled at
  runtime with Add-Type from a small embedded C# class — no external
  module, no internet access, works with the PowerShell 5.1 that ships
  with every Windows install.

  The interface/class GUIDs below are the public, documented identifiers
  from the Windows SDK (mmdeviceapi.h / endpointvolume.h), not something
  invented for this project.

  NOTE (honesty flag): this file has been written carefully against the
  documented COM contract but has not been executed on a real Windows
  machine as part of building this plugin (no Windows environment was
  available). If a volume/mic action errors out, this is the first place
  to look — please report the exact PowerShell error back.
#>

if (-not ("StreamDesk.Audio" -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace StreamDesk {
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioEndpointVolume {
        int NotImpl1();
        int NotImpl2();
        int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
        int NotImpl3();
        int GetMasterVolumeLevelScalar(out float pfLevel);
        int NotImpl4();
        int NotImpl5();
        int NotImpl6();
        int NotImpl7();
        int NotImpl8();
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
        int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice {
        int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, out IAudioEndpointVolume epv);
    }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator {
        int NotImpl1();
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    internal class MMDeviceEnumeratorComObject { }

    public static class Audio {
        // dataFlow: 0 = eRender (speakers/headphones output), 1 = eCapture (microphone input)
        private static IAudioEndpointVolume GetEndpoint(int dataFlow) {
            var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
            IMMDevice device;
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(dataFlow, 1 /* eMultimedia */, out device));
            var iid = typeof(IAudioEndpointVolume).GUID;
            IAudioEndpointVolume epv;
            Marshal.ThrowExceptionForHR(device.Activate(ref iid, 1 /* CLSCTX_INPROC_SERVER */, IntPtr.Zero, out epv));
            return epv;
        }

        public static float GetVolume(int dataFlow) {
            float level;
            Marshal.ThrowExceptionForHR(GetEndpoint(dataFlow).GetMasterVolumeLevelScalar(out level));
            return level;
        }

        public static void SetVolume(int dataFlow, float level) {
            Marshal.ThrowExceptionForHR(GetEndpoint(dataFlow).SetMasterVolumeLevelScalar(level, Guid.Empty));
        }

        public static bool GetMute(int dataFlow) {
            bool muted;
            Marshal.ThrowExceptionForHR(GetEndpoint(dataFlow).GetMute(out muted));
            return muted;
        }

        public static void SetMute(int dataFlow, bool muted) {
            Marshal.ThrowExceptionForHR(GetEndpoint(dataFlow).SetMute(muted, Guid.Empty));
        }
    }
}
"@
}

function Get-StreamDeskVolume {
  param([int]$DataFlow = 0)
  try { return [Math]::Round([StreamDesk.Audio]::GetVolume($DataFlow) * 100) } catch { return $null }
}

function Set-StreamDeskVolume {
  param([int]$DataFlow = 0, [Parameter(Mandatory)][double]$Level)
  $clamped = [Math]::Max(0, [Math]::Min(100, $Level))
  [StreamDesk.Audio]::SetVolume($DataFlow, [float]($clamped / 100.0))
  return [Math]::Round($clamped)
}

function Get-StreamDeskMute {
  param([int]$DataFlow = 0)
  try { return [bool][StreamDesk.Audio]::GetMute($DataFlow) } catch { return $null }
}

function Set-StreamDeskMute {
  param([int]$DataFlow = 0, [Parameter(Mandatory)][bool]$Muted)
  [StreamDesk.Audio]::SetMute($DataFlow, $Muted)
  return $Muted
}

function Switch-StreamDeskMute {
  param([int]$DataFlow = 0)
  $current = Get-StreamDeskMute -DataFlow $DataFlow
  $next = -not [bool]$current
  Set-StreamDeskMute -DataFlow $DataFlow -Muted $next | Out-Null
  return $next
}
