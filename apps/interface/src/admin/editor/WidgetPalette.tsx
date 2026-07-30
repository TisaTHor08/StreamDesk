import { useMemo, useState } from "react";
import type { PresetDefinition, WidgetDefinition } from "@streamdesk/interface-sdk";
import { widgetRegistry, presetRegistry } from "../../widgets/registry.js";
import { PALETTE_DND_MIME, type PaletteDragPayload } from "./GridEditor.js";

type PaletteEntry =
  | { kind: "widget"; id: string; def: WidgetDefinition }
  | { kind: "preset"; id: string; def: PresetDefinition };

const FALLBACK_PLUGIN_NAMES: Record<string, string> = {
  core: "Core",
};

function matchesSearch(entry: PaletteEntry, pluginName: string, query: string): boolean {
  if (!query) return true;
  const haystack = [entry.def.displayName, entry.def.description ?? "", entry.def.category ?? "", pluginName]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function itemStyle(interactive = true): React.CSSProperties {
  return {
    background: "var(--widget-background)",
    border: "1px solid var(--widget-border)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    cursor: interactive ? "grab" : "default",
    userSelect: "none",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  };
}

/**
 * Sidebar list of every registered widget type AND preset (built-in +
 * plugin-provided), grouped by plugin then by category, with a search box
 * to cut through the clutter once a few plugins are installed. Drag an
 * entry onto the canvas to drop it at that exact cell, or click it to
 * append it at the next free row — click-to-add exists because native
 * HTML5 drag-and-drop doesn't work on touch devices, and the admin panel
 * should be just as usable from a tablet as from a desktop browser.
 */
export function WidgetPalette({
  onAddWidget,
  onAddPreset,
  pluginNames = {},
}: {
  onAddWidget: (widgetType: string) => void;
  onAddPreset: (presetId: string) => void;
  /** pluginId -> human-readable plugin name (from installed plugin manifests), for group headers. */
  pluginNames?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const entries: PaletteEntry[] = [
      ...widgetRegistry.list().map((def): PaletteEntry => ({ kind: "widget", id: def.type, def })),
      ...presetRegistry.list().map((def): PaletteEntry => ({ kind: "preset", id: def.id, def })),
    ];
    const normalizedQuery = query.trim().toLowerCase();

    const byPlugin = new Map<string, PaletteEntry[]>();
    for (const entry of entries) {
      const pluginId = entry.def.pluginId;
      const pluginName = pluginNames[pluginId] ?? FALLBACK_PLUGIN_NAMES[pluginId] ?? pluginId;
      if (!matchesSearch(entry, pluginName, normalizedQuery)) continue;
      if (!byPlugin.has(pluginId)) byPlugin.set(pluginId, []);
      byPlugin.get(pluginId)!.push(entry);
    }

    return [...byPlugin.entries()]
      .map(([pluginId, pluginEntries]) => {
        const byCategory = new Map<string, PaletteEntry[]>();
        for (const entry of pluginEntries) {
          const category = entry.def.category ?? "Général";
          if (!byCategory.has(category)) byCategory.set(category, []);
          byCategory.get(category)!.push(entry);
        }
        return {
          pluginId,
          pluginName: pluginNames[pluginId] ?? FALLBACK_PLUGIN_NAMES[pluginId] ?? pluginId,
          categories: [...byCategory.entries()]
            .map(([category, categoryEntries]) => ({
              category,
              entries: categoryEntries.sort((a, b) => a.def.displayName.localeCompare(b.def.displayName)),
            }))
            .sort((a, b) => a.category.localeCompare(b.category)),
        };
      })
      .sort((a, b) => a.pluginName.localeCompare(b.pluginName));
  }, [query, pluginNames]);

  function toggleGroup(pluginId: string) {
    setCollapsedGroups((prev) => ({ ...prev, [pluginId]: !prev[pluginId] }));
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, entry: PaletteEntry) {
    const payload: PaletteDragPayload = { kind: entry.kind, id: entry.id };
    e.dataTransfer.setData(PALETTE_DND_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleClick(entry: PaletteEntry) {
    if (entry.kind === "widget") onAddWidget(entry.id);
    else onAddPreset(entry.id);
  }

  const totalResults = groups.reduce(
    (sum, g) => sum + g.categories.reduce((s, c) => s + c.entries.length, 0),
    0,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <input
        type="search"
        placeholder="Rechercher un widget ou un préréglage..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          background: "var(--widget-background)",
          border: "1px solid var(--widget-border)",
          borderRadius: 8,
          color: "var(--deck-text)",
          padding: "6px 10px",
          fontSize: 13,
          boxSizing: "border-box",
        }}
      />

      {totalResults === 0 && (
        <p style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
          {query ? "Aucun résultat." : "Aucun widget enregistré."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto", flex: 1, minHeight: 0 }}>
        {groups.map((group) => {
          const collapsed = collapsedGroups[group.pluginId] ?? false;
          return (
            <div key={group.pluginId}>
              <button
                onClick={() => toggleGroup(group.pluginId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "var(--deck-muted-text)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  padding: "4px 0",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.1s" }}>
                  ▾
                </span>
                {group.pluginName}
              </button>
              {!collapsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 4 }}>
                  {group.categories.map((cat) => (
                    <div key={cat.category} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <h3 style={{ fontSize: 11, color: "var(--deck-muted-text)", margin: 0, fontWeight: 500 }}>{cat.category}</h3>
                      {cat.entries.map((entry) => (
                        <div
                          key={`${entry.kind}:${entry.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, entry)}
                          onClick={() => handleClick(entry)}
                          title="Glisser sur la grille, ou cliquer pour ajouter"
                          style={itemStyle()}
                        >
                          <span>
                            {entry.kind === "preset" ? "▣ " : ""}
                            {entry.def.displayName}
                          </span>
                          {entry.def.description && (
                            <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>{entry.def.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
