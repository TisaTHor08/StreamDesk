import { usePwaInstall } from "./usePwaInstall.js";

/**
 * "Install app" button, shown only when the browser has actually signaled
 * installability (`beforeinstallprompt`). On browsers that never fire
 * that event (notably Safari/iOS), this renders nothing — the caller
 * should show manual "Add to Home Screen" instructions alongside it
 * instead (see AdminOverviewView, which does both).
 */
export function InstallPwaButton({ style }: { style?: React.CSSProperties }) {
  const { canInstall, installed, promptInstall } = usePwaInstall();

  if (installed) {
    return <span style={{ fontSize: 13, color: "var(--deck-success)" }}>Application installée</span>;
  }
  if (!canInstall) return null;

  return (
    <button
      onClick={() => void promptInstall()}
      style={{
        background: "var(--deck-accent)",
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "8px 14px",
        fontWeight: 600,
        cursor: "pointer",
        ...style,
      }}
    >
      Installer l'application
    </button>
  );
}
