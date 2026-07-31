import { useEffect, useState } from "react";
import { ConnectionBadge } from "@streamdesk/ui-kit";
import { useConnection } from "../state/ConnectionProvider.js";
import { DeckGrid } from "./DeckGrid.js";
import { InstallPwaButton } from "../pwa/InstallPwaButton.js";

// If the socket reports "connected" but no page snapshot has arrived after
// this long, something is wrong beyond ordinary network latency (e.g. a
// rejected/malformed message that the Server logged but never resent) —
// worth telling the person looking at the screen instead of leaving them
// staring at an unexplained blank main area forever.
const STUCK_AFTER_MS = 6000;

export function DeckView() {
  const { state, page, notifications, dismissNotification } = useConnection();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (state !== "connected" || page) {
      setStuck(false);
      return;
    }
    const timer = window.setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [state, page]);

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
        {!page && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--deck-muted-text)",
              textAlign: "center",
              padding: "var(--spacing-lg)",
            }}
          >
            {state !== "connected" ? (
              <span>Connexion au serveur...</span>
            ) : stuck ? (
              <>
                <span>Connecté, mais aucune page reçue.</span>
                <span style={{ fontSize: 12 }}>
                  Rechargez cette page. Si le problème persiste, ouvrez la console du navigateur (elle contient le
                  détail de l'erreur) et vérifiez la page de démarrage dans l'administration.
                </span>
              </>
            ) : (
              <span>Chargement de la page...</span>
            )}
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
