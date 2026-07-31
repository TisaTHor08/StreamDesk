import { useEffect, useMemo, useState } from "react";
import { QrCode } from "@streamdesk/ui-kit";
import { InstallPwaButton } from "../pwa/InstallPwaButton.js";
import { api } from "./api.js";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * "Vue d'ensemble" — the Server's own landing/status dashboard: how many
 * Interfaces/Connects are online right now, and — the local-network
 * pairing/discovery flow from spec section 22 — a QR code and copyable
 * URL a new tablet or phone can use to open (and install as a PWA) this
 * same Interface.
 *
 * If the operator opened this page via `localhost` (the common case when
 * launching from the Server's own PC), `window.location.origin` alone
 * would produce a QR code pointing at "localhost" — meaningless to a
 * phone or tablet on the same network. When that's detected, this page
 * asks the Server for its LAN-facing IPv4 addresses and substitutes one
 * of those in instead, keeping the same port/protocol the page is
 * actually being served on.
 */
export function OverviewView() {
  const [interfaceCount, setInterfaceCount] = useState<{ online: number; total: number } | null>(null);
  const [connectCount, setConnectCount] = useState<{ online: number; total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [lanAddresses, setLanAddresses] = useState<string[] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [defaultPageSlug, setDefaultPageSlug] = useState<string | null>(null);

  const isLoopback = LOOPBACK_HOSTNAMES.has(window.location.hostname);

  useEffect(() => {
    api.listInterfaces().then((rows) =>
      setInterfaceCount({ online: rows.filter((r) => r.online).length, total: rows.length }),
    );
    api.listConnects().then((rows) => setConnectCount({ online: rows.filter((r) => r.online).length, total: rows.length }));
    api.getSettings().then((s) => setDefaultPageSlug(s.defaultPageSlug));
  }, []);

  useEffect(() => {
    if (!isLoopback) return;
    api
      .lanAddresses()
      .then(({ addresses }) => {
        setLanAddresses(addresses);
        setSelectedAddress((current) => current ?? addresses[0] ?? null);
      })
      .catch(() => setLanAddresses([]));
    // window.location doesn't change during this page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pairingUrl = useMemo(() => {
    const base =
      isLoopback && selectedAddress
        ? `${window.location.protocol}//${selectedAddress}${window.location.port ? `:${window.location.port}` : ""}`
        : window.location.origin;
    // Bake the admin-configured startup page into the link/QR code itself
    // (?page=<slug>) instead of relying only on the Server's implicit
    // default-page resolution at registration time. ConnectionProvider
    // re-requests this exact page on every "connected" transition (see
    // its onStateChange handler), so this also self-heals a device that
    // reconnects mid-session after the startup page was changed.
    return defaultPageSlug ? `${base}/?page=${encodeURIComponent(defaultPageSlug)}` : base;
  }, [isLoopback, selectedAddress, defaultPageSlug]);

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

          {isLoopback && lanAddresses && lanAddresses.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--deck-muted-text)", display: "block", marginBottom: 4 }}>
                Ce PC a plusieurs adresses réseau — choisissez celle du réseau utilisé par l'autre appareil :
              </label>
              <select
                value={selectedAddress ?? ""}
                onChange={(e) => setSelectedAddress(e.target.value)}
                style={{ fontSize: 13, padding: "4px 8px" }}
              >
                {lanAddresses.map((addr) => (
                  <option key={addr} value={addr}>
                    {addr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isLoopback && lanAddresses === null && (
            <p style={{ fontSize: 12, color: "var(--deck-muted-text)", marginBottom: 12 }}>
              Recherche de l'adresse réseau de ce PC...
            </p>
          )}

          {isLoopback && lanAddresses !== null && lanAddresses.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--deck-danger, #d33)", marginBottom: 12 }}>
              Aucune adresse réseau locale trouvée : le lien ci-dessous ("localhost") ne fonctionnera
              que depuis ce PC. Vérifiez que ce PC est bien connecté à un réseau Wi-Fi/Ethernet.
            </p>
          )}

          {isLoopback && selectedAddress && (
            <p style={{ fontSize: 12, color: "var(--deck-muted-text)", marginBottom: 12 }}>
              Vous avez ouvert cette page via "localhost" ; le lien et le code QR utilisent
              automatiquement l'adresse réseau de ce PC ({selectedAddress}) pour rester accessibles
              depuis un autre appareil.
            </p>
          )}

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
