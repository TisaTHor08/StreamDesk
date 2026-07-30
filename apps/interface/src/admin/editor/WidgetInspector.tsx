import type {
  ActionDefinition,
  DataSourceDefinition,
  DeckPage,
  JsonSchema,
  WidgetBinding,
  WidgetInstance,
  WidgetInteraction,
  WidgetInteractionTrigger,
} from "@streamdesk/shared-types";
import { widgetRegistry } from "../../widgets/registry.js";

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--deck-muted-text)",
  marginBottom: 10,
};

const iconButtonStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: 6,
  width: 28,
  height: 28,
  cursor: "pointer",
  color: "var(--deck-text)",
};

const smallButtonStyle: React.CSSProperties = {
  background: "var(--widget-background)",
  border: "1px dashed var(--widget-border)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
  color: "var(--deck-text)",
  width: "100%",
};

const rowBoxStyle: React.CSSProperties = {
  border: "1px solid var(--widget-border)",
  borderRadius: 8,
  padding: 8,
  marginBottom: 8,
};

export type WidgetInspectorProps = {
  widget: WidgetInstance;
  pages: DeckPage[];
  actions: ActionDefinition[];
  dataSources: DataSourceDefinition[];
  onChange: (patch: Partial<WidgetInstance>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

/**
 * Right-hand properties panel for whichever widget is currently selected on
 * the canvas. Properties are generated from the widget definition's
 * `propertiesSchema` (JSON Schema subset) so plugin-contributed widgets get
 * a usable form for free, with one special case: `core.navigation`'s
 * `targetSlug` is rendered as a page picker rather than a raw text field,
 * since typing a slug by hand is exactly the kind of friction this editor
 * is meant to remove.
 */
export function WidgetInspector({ widget, pages, actions, dataSources, onChange, onDelete, onDuplicate }: WidgetInspectorProps) {
  const definition = widgetRegistry.get(widget.widgetType);
  const schemaProps = definition?.propertiesSchema.properties ?? {};

  function setProperty(key: string, value: unknown) {
    onChange({ properties: { ...widget.properties, [key]: value } });
  }

  function addInteraction() {
    const next: WidgetInteraction = { trigger: "press", actionId: actions[0]?.id ?? "", input: {} };
    onChange({ interactions: [...(widget.interactions ?? []), next] });
  }

  function updateInteraction(index: number, patch: Partial<WidgetInteraction>) {
    const list = [...(widget.interactions ?? [])];
    const current = list[index];
    if (!current) return;
    list[index] = { ...current, ...patch };
    onChange({ interactions: list });
  }

  function removeInteraction(index: number) {
    onChange({ interactions: (widget.interactions ?? []).filter((_, i) => i !== index) });
  }

  function addBinding() {
    const next: WidgetBinding = { property: "value", dataSourceId: dataSources[0]?.id ?? "" };
    onChange({ bindings: [...(widget.bindings ?? []), next] });
  }

  function updateBinding(index: number, patch: Partial<WidgetBinding>) {
    const list = [...(widget.bindings ?? [])];
    const current = list[index];
    if (!current) return;
    list[index] = { ...current, ...patch };
    onChange({ bindings: list });
  }

  function removeBinding(index: number) {
    onChange({ bindings: (widget.bindings ?? []).filter((_, i) => i !== index) });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, margin: 0 }}>{definition?.displayName ?? widget.widgetType}</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onDuplicate} title="Dupliquer" style={iconButtonStyle}>
            ⧉
          </button>
          <button onClick={onDelete} title="Supprimer" style={{ ...iconButtonStyle, color: "var(--deck-danger)" }}>
            ✕
          </button>
        </div>
      </div>

      <label style={labelStyle}>
        Type de widget
        <select
          style={fieldStyle}
          value={widget.widgetType}
          onChange={(e) => {
            const type = e.target.value;
            const def = widgetRegistry.get(type);
            onChange({
              widgetType: type,
              pluginId: def?.pluginId ?? "core",
              properties: { label: typeof widget.properties.label === "string" ? widget.properties.label : "" },
            });
          }}
        >
          {widgetRegistry.list().map((def) => (
            <option key={def.type} value={def.type}>
              {def.displayName}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>
          Colonne
          <input
            type="number"
            min={0}
            style={fieldStyle}
            value={widget.position.column}
            onChange={(e) => onChange({ position: { ...widget.position, column: Math.max(0, Math.round(Number(e.target.value))) } })}
          />
        </label>
        <label style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>
          Ligne
          <input
            type="number"
            min={0}
            style={fieldStyle}
            value={widget.position.row}
            onChange={(e) => onChange({ position: { ...widget.position, row: Math.max(0, Math.round(Number(e.target.value))) } })}
          />
        </label>
        <label style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>
          Largeur (colonnes)
          <input
            type="number"
            min={1}
            style={fieldStyle}
            value={widget.position.columnSpan}
            onChange={(e) =>
              onChange({ position: { ...widget.position, columnSpan: Math.max(1, Math.round(Number(e.target.value))) } })
            }
          />
        </label>
        <label style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>
          Hauteur (lignes)
          <input
            type="number"
            min={1}
            style={fieldStyle}
            value={widget.position.rowSpan}
            onChange={(e) =>
              onChange({ position: { ...widget.position, rowSpan: Math.max(1, Math.round(Number(e.target.value))) } })
            }
          />
        </label>
      </div>

      <h3 style={{ fontSize: 12, color: "var(--deck-muted-text)", margin: "16px 0 8px" }}>Propriétés</h3>
      {Object.entries(schemaProps).map(([key, propSchema]) => (
        <PropertyField
          key={key}
          fieldKey={key}
          schema={propSchema}
          value={widget.properties[key]}
          isNavigationTarget={widget.widgetType === "core.navigation" && key === "targetSlug"}
          pages={pages}
          onChange={(value) => setProperty(key, value)}
        />
      ))}
      {Object.keys(schemaProps).length === 0 && (
        <p style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>Ce widget n'a pas de propriétés.</p>
      )}

      <h3 style={{ fontSize: 12, color: "var(--deck-muted-text)", margin: "16px 0 8px" }}>
        Interactions ({widget.interactions?.length ?? 0})
      </h3>
      {(widget.interactions ?? []).map((interaction, index) => (
        <div key={index} style={rowBoxStyle}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select
              style={fieldStyle}
              value={interaction.trigger}
              onChange={(e) => updateInteraction(index, { trigger: e.target.value as WidgetInteractionTrigger })}
            >
              <option value="press">press</option>
              <option value="release">release</option>
              <option value="longPress">longPress</option>
              <option value="change">change (sliders)</option>
            </select>
            <button onClick={() => removeInteraction(index)} style={iconButtonStyle} title="Retirer">
              ✕
            </button>
          </div>
          <select
            style={{ ...fieldStyle, marginBottom: 6 }}
            value={interaction.actionId}
            onChange={(e) => updateInteraction(index, { actionId: e.target.value })}
          >
            <option value="">— choisir une action —</option>
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName} ({a.id})
              </option>
            ))}
          </select>
          <label style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>
            Paramètres (JSON)
            <textarea
              style={{ ...fieldStyle, minHeight: 44, fontFamily: "monospace" }}
              defaultValue={JSON.stringify(interaction.input ?? {}, null, 2)}
              onBlur={(e) => {
                try {
                  const value = e.target.value.trim() === "" ? {} : JSON.parse(e.target.value);
                  updateInteraction(index, { input: value });
                } catch {
                  // Invalid JSON: leave the previously saved value in place.
                }
              }}
            />
          </label>
        </div>
      ))}
      <button onClick={addInteraction} style={smallButtonStyle}>
        + Interaction
      </button>

      <h3 style={{ fontSize: 12, color: "var(--deck-muted-text)", margin: "16px 0 8px" }}>
        Données liées ({widget.bindings?.length ?? 0})
      </h3>
      {(widget.bindings ?? []).map((binding, index) => (
        <div key={index} style={rowBoxStyle}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              style={fieldStyle}
              placeholder="propriété (ex: value)"
              value={binding.property}
              onChange={(e) => updateBinding(index, { property: e.target.value })}
            />
            <button onClick={() => removeBinding(index)} style={iconButtonStyle} title="Retirer">
              ✕
            </button>
          </div>
          <select
            style={fieldStyle}
            value={binding.dataSourceId}
            onChange={(e) => updateBinding(index, { dataSourceId: e.target.value })}
          >
            <option value="">— choisir une source de données —</option>
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.displayName} ({ds.id})
              </option>
            ))}
          </select>
        </div>
      ))}
      <button onClick={addBinding} style={smallButtonStyle}>
        + Donnée liée
      </button>
    </div>
  );
}

function PropertyField({
  fieldKey,
  schema,
  value,
  isNavigationTarget,
  pages,
  onChange,
}: {
  fieldKey: string;
  schema: JsonSchema;
  value: unknown;
  isNavigationTarget: boolean;
  pages: DeckPage[];
  onChange: (value: unknown) => void;
}) {
  if (isNavigationTarget) {
    return (
      <label style={labelStyle}>
        Page cible
        <select
          style={fieldStyle}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— choisir une page —</option>
          {pages.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.name} {p.slug === "home" ? "(accueil)" : `(${p.slug})`}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (schema.type === "boolean") {
    return (
      <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {fieldKey}
      </label>
    );
  }

  if (schema.enum) {
    return (
      <label style={labelStyle}>
        {fieldKey}
        <select style={fieldStyle} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {schema.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (schema.type === "number" || schema.type === "integer") {
    return (
      <label style={labelStyle}>
        {fieldKey}
        <input
          type="number"
          style={fieldStyle}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </label>
    );
  }

  return (
    <label style={labelStyle}>
      {fieldKey}
      <input
        type="text"
        style={fieldStyle}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
