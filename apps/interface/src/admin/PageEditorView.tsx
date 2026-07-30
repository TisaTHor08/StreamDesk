import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DeckPage, WidgetInstance } from "@streamdesk/shared-types";
import { widgetRegistry } from "../widgets/registry.js";
import { api } from "./api.js";
import { primaryButtonStyle } from "./PagesListView.js";

const fieldStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: 8,
  color: "var(--deck-text)",
  padding: "6px 10px",
  fontSize: 13,
};

function emptyWidget(): WidgetInstance {
  const type = widgetRegistry.list()[0]?.type ?? "core.button";
  return {
    id: crypto.randomUUID(),
    widgetType: type,
    pluginId: widgetRegistry.get(type)?.pluginId ?? "core",
    position: { column: 0, row: 0, columnSpan: 1, rowSpan: 1 },
    properties: { label: "Nouveau" },
  };
}

export function PageEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<DeckPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getPage(id).then(setPage);
  }, [id]);

  if (!page) return <p>Chargement...</p>;

  function updateWidget(index: number, patch: Partial<WidgetInstance>) {
    setPage((prev) => {
      if (!prev) return prev;
      const widgets = [...prev.widgets];
      widgets[index] = { ...widgets[index], ...patch };
      return { ...prev, widgets };
    });
  }

  function updateWidgetJson(index: number, key: "properties" | "interactions" | "bindings", raw: string) {
    try {
      const value = raw.trim() === "" ? (key === "properties" ? {} : undefined) : JSON.parse(raw);
      updateWidget(index, { [key]: value } as Partial<WidgetInstance>);
      setError(null);
    } catch {
      setError(`JSON invalide pour "${key}" du widget ${index + 1}`);
    }
  }

  async function save() {
    if (!page || !id) return;
    setSaving(true);
    try {
      await api.updatePage(id, {
        name: page.name,
        slug: page.slug,
        grid: page.grid,
        widgets: page.widgets,
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id || !window.confirm("Supprimer cette page ?")) return;
    await api.deletePage(id);
    navigate("/admin/pages");
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18 }}>Éditer la page</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/?page=${page.slug}`} target="_blank" rel="noreferrer" style={{ ...primaryButtonStyle, background: "var(--widget-background)", color: "var(--deck-text)", textDecoration: "none" }}>
            Aperçu
          </a>
          <button onClick={save} disabled={saving} style={primaryButtonStyle}>
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button onClick={remove} style={{ ...primaryButtonStyle, background: "var(--deck-danger)" }}>
            Supprimer
          </button>
        </div>
      </div>

      {error && <p style={{ color: "var(--deck-danger)" }}>{error}</p>}

      <fieldset style={{ border: "1px solid var(--widget-border)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <legend>Page</legend>
        <label>
          Nom{" "}
          <input style={fieldStyle} value={page.name} onChange={(e) => setPage({ ...page, name: e.target.value })} />
        </label>{" "}
        <label>
          Slug{" "}
          <input style={fieldStyle} value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value })} />
        </label>{" "}
        <label>
          Colonnes{" "}
          <input
            type="number"
            style={{ ...fieldStyle, width: 60 }}
            value={page.grid.columns}
            onChange={(e) => setPage({ ...page, grid: { ...page.grid, columns: Number(e.target.value) } })}
          />
        </label>
      </fieldset>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 15 }}>Widgets ({page.widgets.length})</h2>
        <button
          onClick={() => setPage({ ...page, widgets: [...page.widgets, emptyWidget()] })}
          style={{ ...primaryButtonStyle, padding: "4px 10px" }}
        >
          + Widget
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {page.widgets.map((widget, index) => (
          <div key={widget.id} style={{ border: "1px solid var(--widget-border)", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <select
                style={fieldStyle}
                value={widget.widgetType}
                onChange={(e) =>
                  updateWidget(index, {
                    widgetType: e.target.value,
                    pluginId: widgetRegistry.get(e.target.value)?.pluginId ?? "core",
                  })
                }
              >
                {widgetRegistry.list().map((def) => (
                  <option key={def.type} value={def.type}>
                    {def.displayName}
                  </option>
                ))}
              </select>
              {(["column", "row", "columnSpan", "rowSpan"] as const).map((field) => (
                <label key={field} style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
                  {field}{" "}
                  <input
                    type="number"
                    style={{ ...fieldStyle, width: 50 }}
                    value={widget.position[field]}
                    onChange={(e) =>
                      updateWidget(index, { position: { ...widget.position, [field]: Number(e.target.value) } })
                    }
                  />
                </label>
              ))}
              <button
                onClick={() => setPage({ ...page, widgets: page.widgets.filter((w) => w.id !== widget.id) })}
                style={{ ...primaryButtonStyle, background: "var(--deck-danger)", marginLeft: "auto" }}
              >
                Retirer
              </button>
            </div>
            <label style={{ display: "block", fontSize: 12, color: "var(--deck-muted-text)" }}>
              Propriétés (JSON)
              <textarea
                style={{ ...fieldStyle, width: "100%", minHeight: 50, fontFamily: "monospace" }}
                defaultValue={JSON.stringify(widget.properties, null, 2)}
                onBlur={(e) => updateWidgetJson(index, "properties", e.target.value)}
              />
            </label>
            <label style={{ display: "block", fontSize: 12, color: "var(--deck-muted-text)" }}>
              Interactions (JSON — actionId, input, target)
              <textarea
                style={{ ...fieldStyle, width: "100%", minHeight: 50, fontFamily: "monospace" }}
                defaultValue={JSON.stringify(widget.interactions ?? [], null, 2)}
                onBlur={(e) => updateWidgetJson(index, "interactions", e.target.value)}
              />
            </label>
            <label style={{ display: "block", fontSize: 12, color: "var(--deck-muted-text)" }}>
              Bindings (JSON — property, dataSourceId)
              <textarea
                style={{ ...fieldStyle, width: "100%", minHeight: 40, fontFamily: "monospace" }}
                defaultValue={JSON.stringify(widget.bindings ?? [], null, 2)}
                onBlur={(e) => updateWidgetJson(index, "bindings", e.target.value)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
