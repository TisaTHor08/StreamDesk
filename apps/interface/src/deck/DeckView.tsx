import { ConnectionBadge } from "@streamdesk/ui-kit";
import { useConnection } from "../state/ConnectionProvider.js";
import { DeckGrid } from "./DeckGrid.js";
import { InstallPwaButton } from "../pwa/InstallPwaButton.js";

export function DeckView() {
  const { state, page, notifications, dismissNotification } = useConnection();

  return (
    <div style={{ height: "100dvh", width: "100vw", background: "var(--deck-background)", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--spacing-sm) var(--spacing-md)",
          borderBottom: "1px solid var(--widget-border)",
        }}
      >
        <span style={{ color: "var(--deck-text)", fontWeight: 700, fontSize: 14 }}>{page?.name ?? "StreamDesk"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <InstallPwaButton style={{ padding: "4px 10px", fontSize: 12 }} />
          <ConnectionBadge state={state === "connecting" ? "connecting" : state === "connected" ? "connected" : "disconnected"} />
        </div>
      </header>

      <main style={{ flex: 1, overflow: "auto" }}>
        {state !== "connected" && !page && (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--deck-muted-text)" }}>
            Connexion au serveur...
          </div>
        )}
        {page && <DeckGrid page={page} />}
      </main>

      <div style={{ position: "fixed", bottom: 16, left: 16, right: 16, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            onClick={() => dismissNotification(notification.id)}
            style={{
              pointerEvents: "auto",
              background: notification.level === "error" ? "var(--deck-danger)" : "var(--widget-background)",
              color: notification.level === "error" ? "white" : "var(--deck-text)",
              border: "1px solid var(--widget-border)",
              borderRadius: "var(--widget-radius)",
              padding: "var(--spacing-sm) var(--spacing-md)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
}
