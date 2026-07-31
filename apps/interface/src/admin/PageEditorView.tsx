import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
  ActionDefinition,
  DataSourceDefinition,
  DeckPage,
  GridPosition,
  InteractionVariable,
  WidgetInstance,
} from "@streamdesk/shared-types";
import type { InstalledPlugin } from "@streamdesk/plugin-manifest";
import { widgetRegistry, presetRegistry } from "../widgets/registry.js";
import { GridEditor } from "./editor/GridEditor.js";
import { WidgetPalette } from "./editor/WidgetPalette.js";
import { WidgetInspector } from "./editor/WidgetInspector.js";
import { CollapsibleSection } from "./editor/CollapsibleSection.js";
import { api } from "./api.js";
import { primaryButtonStyle } from "./PagesListView.js";

const fieldStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: 8,
  color: "var(--deck-text)",
  padding: "6px 10px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--deck-muted-text)", marginBottom: 10 };

const panelStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: "var(--widget-radius)",
  padding: 14,
};

/** Every view other than "home" must offer a way back — enforced here, not
 * just at creation time, so a page can never be saved without one even if
 * its back button was deleted mid-edit. */
function ensureBackButton(page: DeckPage): DeckPage {
  if (page.slug === "home") return page;
  if (page.widgets.some((w) => w.widgetType === "core.navigation")) return page;
  const backWidget: WidgetInstance = {
    id: crypto.randomUUID(),
    widgetType: "core.navigation",
    pluginId: "core",
    position: { column: 0, row: 0, columnSpan: 1, rowSpan: 1 },
    properties: { label: "Retour", targetSlug: "home" },
  };
  return { ...page, widgets: [backWidget, ...page.widgets] };
}

export function PageEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<DeckPage | null>(null);
  const [allPages, setAllPages] = useState<DeckPage[]>([]);
  const [actions, setActions] = useState<ActionDefinition[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceDefinition[]>([]);
  const [variables, setVariables] = useState<InteractionVariable[]>([]);
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pageSectionCollapsed, setPageSectionCollapsed] = useState(true);
  const [gridSectionCollapsed, setGridSectionCollapsed] = useState(true);
  const [widgetsSectionCollapsed, setWidgetsSectionCollapsed] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getPage(id).then(setPage);
    api.listPages().then(setAllPages);
    api.listActions().then(setActions);
    api.listDataSources().then(setDataSources);
    api.listVariables().then(setVariables);
    api.listPlugins().then(setPlugins);
  }, [id]);

  const pluginNames = useMemo(
    () => Object.fromEntries(plugins.map((p) => [p.manifest.id, p.manifest.name])),
    [plugins],
  );

  if (!page) return <p>Chargement...</p>;

  const selectedWidget = page.widgets.find((w) => w.id === selectedWidgetId) ?? null;

  function addWidget(widgetType: string, at?: { column: number; row: number }) {
    if (!page) return;
    const def = widgetRegistry.get(widgetType);
    const nextRow = page.widgets.reduce((max, w) => Math.max(max, w.position.row + w.position.rowSpan), 0);
    const position: GridPosition = {
      column: at?.column ?? 0,
      row: at?.row ?? nextRow,
      columnSpan: def?.defaultSize.columnSpan ?? 1,
      rowSpan: def?.defaultSize.rowSpan ?? 1,
    };
    const widget: WidgetInstance = {
      id: crypto.randomUUID(),
      widgetType,
      pluginId: def?.pluginId ?? "core",
      position,
      properties: widgetType === "core.navigation" ? { label: "Aller à...", targetSlug: "" } : { label: def?.displayName ?? "" },
    };
    setPage({ ...page, widgets: [...page.widgets, widget] });
    setSelectedWidgetId(widget.id);
  }

  /** Expands a registered preset into concrete widget instances, positioned
   * relative to `at` (or the next free row) using each entry's own `offset`. */
  function addPreset(presetId: string, at?: { column: number; row: number }) {
    if (!page) return;
    const preset = presetRegistry.get(presetId);
    if (!preset) return;
    const baseRow = at?.row ?? page.widgets.reduce((max, w) => Math.max(max, w.position.row + w.position.rowSpan), 0);
    const baseColumn = at?.column ?? 0;
    const newWidgets: WidgetInstance[] = preset.widgets.map((entry) => {
      const offset = entry.offset ?? { column: 0, row: 0 };
      return {
        id: crypto.randomUUID(),
        widgetType: entry.widgetType,
        pluginId: preset.pluginId,
        position: {
          column: Math.max(0, Math.min(page.grid.columns - entry.defaultSize.columnSpan, baseColumn + offset.column)),
          row: Math.max(0, baseRow + offset.row),
          columnSpan: entry.defaultSize.columnSpan,
          rowSpan: entry.defaultSize.rowSpan,
        },
        properties: entry.properties,
        bindings: entry.bindings,
        interactions: entry.interactions,
      };
    });
    setPage({ ...page, widgets: [...page.widgets, ...newWidgets] });
    setSelectedWidgetId(newWidgets[0]?.id ?? null);
  }

  function changePosition(widgetId: string, position: GridPosition) {
    if (!page) return;
    setPage({ ...page, widgets: page.widgets.map((w) => (w.id === widgetId ? { ...w, position } : w)) });
  }

  function updateWidget(widgetId: string, patch: Partial<WidgetInstance>) {
    if (!page) return;
    setPage({ ...page, widgets: page.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)) });
  }

  function removeWidget(widgetId: string) {
    if (!page) return;
    setPage({ ...page, widgets: page.widgets.filter((w) => w.id !== widgetId) });
    if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
  }

  function duplicateWidget(widgetId: string) {
    if (!page) return;
    const original = page.widgets.find((w) => w.id === widgetId);
    if (!original) return;
    const copy: WidgetInstance = {
      ...original,
      id: crypto.randomUUID(),
      position: {
        ...original.position,
        column: Math.max(0, Math.min(page.grid.columns - original.position.columnSpan, original.position.column + 1)),
        row: original.position.row + 1,
      },
    };
    setPage({ ...page, widgets: [...page.widgets, copy] });
    setSelectedWidgetId(copy.id);
  }

  async function save() {
    if (!page || !id) return;
    const finalPage = ensureBackButton(page);
    if (finalPage !== page) {
      setPage(finalPage);
      setNotice('Bouton "Retour" ajouté automatiquement — toutes les pages hors accueil doivent en avoir un.');
    } else {
      setNotice(null);
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api.updatePage(id, {
        name: finalPage.name,
        slug: finalPage.slug,
        grid: finalPage.grid,
        widgets: finalPage.widgets,
      });
      setPage(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!page || !id || page.slug === "home") return;
    if (!window.confirm("Supprimer cette page ?")) return;
    await api.deletePage(id);
    navigate("/admin/pages");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18 }}>Éditer « {page.name} »</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`/?page=${page.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ ...primaryButtonStyle, background: "var(--widget-background)", color: "var(--deck-text)", textDecoration: "none" }}
          >
            Aperçu
          </a>
          <button onClick={save} disabled={saving} style={primaryButtonStyle}>
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button
            onClick={remove}
            disabled={page.slug === "home"}
            title={page.slug === "home" ? "La page d'accueil ne peut pas être supprimée" : undefined}
            style={{ ...primaryButtonStyle, background: "var(--deck-danger)", opacity: page.slug === "home" ? 0.5 : 1 }}
          >
            Supprimer
          </button>
        </div>
      </div>

      {error && <p style={{ color: "var(--deck-danger)" }}>{error}</p>}
      {notice && <p style={{ color: "var(--deck-accent)" }}>{notice}</p>}

      <div style={{ display: "flex", gap: 16, alignItems: "stretch", height: "calc(100vh - 160px)", minHeight: 480 }}>
        <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
          <CollapsibleSection title="Page" collapsed={pageSectionCollapsed} onToggle={() => setPageSectionCollapsed((v) => !v)}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <label style={labelStyle}>
                Nom
                <input style={fieldStyle} value={page.name} onChange={(e) => setPage({ ...page, name: e.target.value })} />
              </label>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Slug
                <input
                  style={fieldStyle}
                  value={page.slug}
                  disabled={page.slug === "home"}
                  onChange={(e) => setPage({ ...page, slug: e.target.value })}
                />
              </label>
            </fieldset>
          </CollapsibleSection>

          <CollapsibleSection title="Grille" collapsed={gridSectionCollapsed} onToggle={() => setGridSectionCollapsed((v) => !v)}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <label style={labelStyle}>
                Format
                <select style={fieldStyle} value="phone" disabled>
                  <option value="phone">📱 Téléphone</option>
                </select>
              </label>
              <p style={{ fontSize: 11, color: "var(--deck-muted-text)", marginTop: -6 }}>
                Tablette et bureau : prochaine version.
              </p>
              <label style={labelStyle}>
                Colonnes
                <input
                  type="number"
                  min={2}
                  max={8}
                  style={fieldStyle}
                  value={page.grid.columns}
                  onChange={(e) =>
                    setPage({
                      ...page,
                      grid: { ...page.grid, columns: Math.max(2, Math.min(8, Math.round(Number(e.target.value)))) },
                    })
                  }
                />
              </label>
              <label style={labelStyle}>
                Hauteur de ligne (px)
                <input
                  type="number"
                  min={40}
                  style={fieldStyle}
                  value={page.grid.rowHeight}
                  onChange={(e) => setPage({ ...page, grid: { ...page.grid, rowHeight: Math.max(40, Number(e.target.value)) } })}
                />
              </label>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Espacement (px)
                <input
                  type="number"
                  min={0}
                  style={fieldStyle}
                  value={page.grid.gap}
                  onChange={(e) => setPage({ ...page, grid: { ...page.grid, gap: Math.max(0, Number(e.target.value)) } })}
                />
              </label>
            </fieldset>
          </CollapsibleSection>

          <CollapsibleSection
            title="Widgets"
            collapsed={widgetsSectionCollapsed}
            onToggle={() => setWidgetsSectionCollapsed((v) => !v)}
            grow
          >
            <WidgetPalette onAddWidget={(type) => addWidget(type)} onAddPreset={(presetId) => addPreset(presetId)} pluginNames={pluginNames} />
          </CollapsibleSection>
        </div>

        <div style={{ flex: "1 1 380px", minWidth: 280, overflow: "auto" }}>
          <GridEditor
            grid={page.grid}
            widgets={page.widgets}
            selectedWidgetId={selectedWidgetId}
            onSelect={setSelectedWidgetId}
            onChangePosition={changePosition}
            onAddWidget={addWidget}
            onAddPreset={addPreset}
          />
        </div>

        <div style={{ width: 320, flexShrink: 0, overflow: "auto", ...panelStyle }}>
          {selectedWidget ? (
            <WidgetInspector
              widget={selectedWidget}
              pages={allPages}
              actions={actions}
              dataSources={dataSources}
              variables={variables}
              pluginNames={pluginNames}
              onChange={(patch) => updateWidget(selectedWidget.id, patch)}
              onDelete={() => removeWidget(selectedWidget.id)}
              onDuplicate={() => duplicateWidget(selectedWidget.id)}
            />
          ) : (
            <p style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>
              Sélectionnez un widget sur la grille pour modifier ses propriétés, ou glissez-en un depuis la palette à
              gauche.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
