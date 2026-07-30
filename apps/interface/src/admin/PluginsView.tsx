import { useEffect, useState } from "react";
import type { InstalledPlugin } from "@streamdesk/plugin-manifest";
import type { ActionDefinition, DataSourceDefinition, EventDefinition } from "@streamdesk/shared-types";
import { api } from "./api.js";

export function PluginsView() {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [actions, setActions] = useState<ActionDefinition[]>([]);
  const [events, setEvents] = useState<EventDefinition[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceDefinition[]>([]);

  function refresh() {
    api.listPlugins().then(setPlugins);
    api.listActions().then(setActions);
    api.listEvents().then(setEvents);
    api.listDataSources().then(setDataSources);
  }

  useEffect(refresh, []);

  async function toggle(plugin: InstalledPlugin) {
    await api.setPluginEnabled(plugin.manifest.id, plugin.state !== "enabled");
    refresh();
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Plugins ({plugins.length})</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {plugins.map((plugin) => (
          <div key={plugin.manifest.id} style={{ border: "1px solid var(--widget-border)", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{plugin.manifest.name}</strong>{" "}
                <span style={{ color: "var(--deck-muted-text)", fontSize: 12 }}>
                  v{plugin.manifest.version} — {plugin.manifest.id}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: plugin.state === "enabled" ? "var(--deck-success)" : plugin.state === "error" ? "var(--deck-danger)" : "var(--deck-muted-text)",
                  }}
                >
                  {plugin.state}
                </span>
                <button onClick={() => toggle(plugin)} style={{ fontSize: 12, padding: "4px 10px" }}>
                  {plugin.state === "enabled" ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>
            {plugin.lastError && <p style={{ color: "var(--deck-danger)", fontSize: 12 }}>{plugin.lastError}</p>}
            <p style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
              Composants : {Object.keys(plugin.manifest.components).join(", ") || "aucun"} — Permissions :{" "}
              {plugin.manifest.permissions.join(", ") || "aucune"}
            </p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 15, marginBottom: 8 }}>Actions disponibles ({actions.length})</h2>
      <ul style={{ fontSize: 13, color: "var(--deck-muted-text)", marginBottom: 24 }}>
        {actions.map((a) => (
          <li key={a.id}>
            <code>{a.id}</code> — {a.displayName} ({a.executionLocation})
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 15, marginBottom: 8 }}>Événements ({events.length})</h2>
      <ul style={{ fontSize: 13, color: "var(--deck-muted-text)", marginBottom: 24 }}>
        {events.map((e) => (
          <li key={e.id}>
            <code>{e.id}</code>
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 15, marginBottom: 8 }}>Sources de données ({dataSources.length})</h2>
      <ul style={{ fontSize: 13, color: "var(--deck-muted-text)" }}>
        {dataSources.map((d) => (
          <li key={d.id}>
            <code>{d.id}</code> — {d.displayName}
          </li>
        ))}
      </ul>
    </div>
  );
}
