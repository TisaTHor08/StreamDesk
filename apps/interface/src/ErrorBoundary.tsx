import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * The gap that turned "crypto.randomUUID() throws on an insecure context
 * (a plain http://<lan-ip>)" into a totally blank, unexplained black
 * screen: React 18 unmounts the *entire* tree on an uncaught render error
 * unless something catches it — there was nothing here that did. This
 * doesn't fix the underlying bug class (that's on whoever writes the code
 * to not throw), it just makes sure the person looking at the screen sees
 * *something* — an actual error message instead of a color — the next
 * time anything else slips through.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[StreamDesk] Erreur non interceptée — l'interface a été interrompue", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          height: "100dvh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          background: "#101114",
          color: "#f4f5f7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700 }}>StreamDesk a rencontré une erreur</span>
        <code style={{ fontSize: 12, color: "#9a9ea7", maxWidth: 480, wordBreak: "break-word" }}>{this.state.error.message}</code>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ marginTop: 8, background: "#5b8cff", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}
        >
          Recharger
        </button>
      </div>
    );
  }
}
