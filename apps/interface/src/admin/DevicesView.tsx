import { useEffect, useState } from "react";
import type { ConnectRecord, InterfaceRecord } from "@streamdesk/shared-types";
import { api } from "./api.js";

export function DevicesView() {
  const [interfaces, setInterfaces] = useState<(InterfaceRecord & { online: boolean })[]>([]);
  const [connects, setConnects] = useState<(ConnectRecord & { online: boolean })[]>([]);

  function refresh() {
    api.listInterfaces().then(setInterfaces);
    api.listConnects().then(setConnects);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Connect ({connects.length})</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {connects.map((connect) => (
          <div key={connect.connectId} style={{ border: "1px solid var(--widget-border)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{connect.name}</strong>{" "}
              <span style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
                {connect.platform}/{connect.architecture} — v{connect.version}
              </span>
              <p style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
                {connect.capabilities.length} capacité(s) — dernier contact {new Date(connect.lastSeenAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: connect.online ? "var(--deck-success)" : "var(--deck-danger)", fontSize: 12 }}>
                {connect.online ? "en ligne" : "hors ligne"}
              </span>
              <button onClick={() => api.revokeConnect(connect.connectId).then(refresh)} style={{ fontSize: 12 }}>
                Révoquer
              </button>
            </div>
          </div>
        ))}
        {connects.length === 0 && <p style={{ color: "var(--deck-muted-text)" }}>Aucun Connect connu.</p>}
      </div>

      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Interfaces ({interfaces.length})</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {interfaces.map((iface) => (
          <div key={iface.interfaceId} style={{ border: "1px solid var(--widget-border)", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{iface.name}</strong>
              <p style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
                {iface.viewport.width}×{iface.viewport.height} — dernier contact {new Date(iface.lastSeenAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: iface.online ? "var(--deck-success)" : "var(--deck-danger)", fontSize: 12 }}>
                {iface.online ? "en ligne" : "hors ligne"}
              </span>
              <button onClick={() => api.revokeInterface(iface.interfaceId).then(refresh)} style={{ fontSize: 12 }}>
                Révoquer
              </button>
            </div>
          </div>
        ))}
        {interfaces.length === 0 && <p style={{ color: "var(--deck-muted-text)" }}>Aucune Interface connue.</p>}
      </div>
    </div>
  );
}
