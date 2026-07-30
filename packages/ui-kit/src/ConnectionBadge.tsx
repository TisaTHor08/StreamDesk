export type ConnectionState = "connected" | "connecting" | "disconnected";

const LABELS: Record<ConnectionState, string> = {
  connected: "Serveur connecté",
  connecting: "Connexion...",
  disconnected: "Serveur déconnecté",
};

const COLORS: Record<ConnectionState, string> = {
  connected: "var(--deck-success)",
  connecting: "var(--deck-muted-text)",
  disconnected: "var(--deck-danger)",
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-sm)",
        fontSize: 13,
        color: "var(--deck-muted-text)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: COLORS[state],
          display: "inline-block",
        }}
      />
      {LABELS[state]}
    </div>
  );
}
