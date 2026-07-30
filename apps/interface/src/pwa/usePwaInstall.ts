import { useEffect, useState } from "react";

// Not in lib.dom.d.ts yet in most TS versions — minimal shape we need.
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Wraps the standard (Chromium-based browsers) `beforeinstallprompt` PWA
 * installability signal. Safari/iOS never fires this event — there,
 * "install" is the manual "Add to Home Screen" share-sheet action, which
 * can't be triggered programmatically; `canInstall` simply stays false
 * and callers should fall back to instructions text (see AdminOverviewView).
 */
export function usePwaInstall() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!deferredEvent) return "unavailable";
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    setDeferredEvent(null);
    return choice.outcome;
  }

  return { canInstall: Boolean(deferredEvent) && !installed, installed, promptInstall };
}
