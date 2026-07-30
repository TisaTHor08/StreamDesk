import { useEffect, useState } from "react";
import { QrCode } from "@streamdesk/ui-kit";
import { InstallPwaButton } from "../pwa/InstallPwaButton.js";
import { api } from "./api.js";

/**
 * "Vue d'ensemble" — the Server's own landing/status dashboard: how many
 * Interfaces/Connects are online right now, and — the local-network
 * pairing/discovery flow from spec section 22 — a QR code and copyable
 * URL a new tablet or phone can use to open (and install as a PWA) this
 * same Interface.
 */
export function OverviewView() {
  const [interfaceCount, setInterfaceCount] = useState<{ online: number; total: number } | null>(null);
  const [connectCount, setConnectCount] = useState<{ online: number; total: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const pairingUrl = window.location.origin;

  useEffect(() => {
    api.listInterfaces().then((rows) =>
      setInterfaceCount({ online: rows.filter((r) => r.online).length, total: rows.length }),
    );
    api.listConnects().then((rows) => setConnectCount({ online: rows.filter((r) => r.online).length, total: rows.length }));
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS, or permission denied) — the
      // link is still shown selectable as plain text, so nothing is lost.
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Vue d'ensemble</h1>

      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="Connect en ligne" value={connectCount ? `${connectCount.online} / ${connectCount.total}` : "…"} />
        <StatCard
          label="Interfaces en ligne"
          value={interfaceCount ? `${interfaceCount.online} / ${interfaceCount.total}` : "…"}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
          background: "var(--widget-background)",
          border: "1px solid var(--widget-border)",
          borderRadius: "var(--widget-radius)",
          padding: "var(--spacing-lg)",
        }}
      >
        <QrCode
          value={pairingUrl}
          size={180}
          fallback={
            <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--deck-muted-text)", fontSize: 12, textAlign: "center" }}>
              (code QR indisponible pour cette adresse — utilisez le lien)
            </div>
          }
        />

        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Connecter un nouvel écran</h2>
          <p style={{ fontSize: 13, color: "var(--deck-muted-text)", marginBottom: 12 }}>
            Scannez ce code avec une tablette ou un téléphone sur le même réseau, ou ouvrez le lien
            ci-dessous. Le nouvel écran se connectera automatiquement au Serveur.
          </p>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <code
              style={{
                background: "var(--deck-background)",
                border: "1px solid var(--widget-border)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
                userSelect: "all",
              }}
            >
              {pairingUrl}
            </code>
            <button onClick={copyLink} style={{ fontSize: 12, padding: "6px 10px" }}>
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <InstallPwaButton />
            <span style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
              Sur iOS/Safari : bouton Partager → "Sur l'écran d'accueil".
            </span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--deck-muted-text)", marginTop: 24 }}>
        La première connexion d'un nouvel écran ou d'un Connect est acceptée automatiquement en V1
        (voir docs/architecture/security.md). Vous pouvez révoquer un appareil à tout moment depuis{" "}
        <a href="/admin/devices" style={{ color: "var(--deck-accent)" }}>
          Appareils
        </a>
        .
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--widget-background)",
        border: "1px solid var(--widget-border)",
        borderRadius: "var(--widget-radius)",
        padding: "var(--spacing-md)",
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
