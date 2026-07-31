import { useState } from "react";
import type {
  ActionDefinition,
  ConnectRecord,
  DataSourceDefinition,
  DeckPage,
  InteractionBlock,
  InteractionVariable,
  JsonSchema,
  WidgetBinding,
  WidgetInstance,
  WidgetInteractionTrigger,
} from "@streamdesk/shared-types";
import { widgetRegistry } from "../../widgets/registry.js";
import { InteractionScriptEditor, type BlockEditorContext } from "./InteractionScriptEditor.js";
import { IconPickerField } from "./IconPickerField.js";

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

const DISCRETE_TRIGGERS: WidgetInteractionTrigger[] = ["press", "release", "longPress"];
const TRIGGER_LABELS: Record<WidgetInteractionTrigger, string> = {
  press: "Appui",
  release: "Relâchement",
  longPress: "Appui long",
  change: "Changement (curseur / interrupteur)",
};

export type WidgetInspectorProps = {
  widget: WidgetInstance;
  pages: DeckPage[];
  actions: ActionDefinition[];
  dataSources: DataSourceDefinition[];
  variables: InteractionVariable[];
  connects: (ConnectRecord & { online: boolean })[];
  pluginNames: Record<string, string>;
  onChange: (patch: Partial<WidgetInstance>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

/**
 * Right-hand properties panel for whichever widget is currently selected on
 * the canvas. Properties are generated from the widget definition's
 * `propertiesSchema` (JSON Schema subset) so plugin-contributed widgets get
 * a usable form for free, with two special cases: `core.navigation`'s
 * `targetSlug` is rendered as a page picker, and any property with
 * `format: "icon"` gets the Iconify/upload icon picker — typing either by
 * hand is exactly the kind of friction this editor is meant to remove.
 *
 * Position (column/row/width/height) is deliberately NOT editable here —
 * it's set by dragging/resizing the widget directly on the grid, and
 * showing redundant number fields for it here just invites the two to
 * drift out of sync.
 */
export function WidgetInspector({
  widget,
  pages,
  actions,
  dataSources,
  variables,
  connects,
  pluginNames,
  onChange,
  onDelete,
  onDuplicate,
}: WidgetInspectorProps) {
  const definition = widgetRegistry.get(widget.widgetType);
  const schemaProps: Record<string, JsonSchema> = definition?.propertiesSchema.properties ?? {};
  const [editingTrigger, setEditingTrigger] = useState<WidgetInteractionTrigger | null>(null);

  function setProperty(key: string, value: unknown) {
    onChange({ properties: { ...widget.properties, [key]: value } });
  }

  function blocksFor(trigger: WidgetInteractionTrigger): InteractionBlock[] {
    return widget.interactions?.find((i) => i.trigger === trigger)?.blocks ?? [];
  }

  function saveBlocks(trigger: WidgetInteractionTrigger, blocks: InteractionBlock[]) {
    const others = (widget.interactions ?? []).filter((i) => i.trigger !== trigger);
    const next = blocks.length > 0 ? [...others, { trigger, blocks }] : others;
    onChange({ interactions: next });
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

  const availableTriggers: WidgetInteractionTrigger[] =
    definition?.interactionMode === "continuous" ? ["change"] : DISCRETE_TRIGGERS;

  const editorCtx: BlockEditorContext = { actions, dataSources, variables, connects, pluginNames };

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

      <h3 style={{ fontSize: 12, color: "var(--deck-muted-text)", margin: "16px 0 8px" }}>Interactions</h3>
      {availableTriggers.map((trigger) => {
        const count = blocksFor(trigger).length;
        return (
          <div key={trigger} style={{ ...rowBoxStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{TRIGGER_LABELS[trigger]}</div>
              <div style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>
                {count === 0 ? "Aucun bloc" : `${count} bloc${count > 1 ? "s" : ""}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {count > 0 && (
                <button onClick={() => saveBlocks(trigger, [])} style={{ ...iconButtonStyle, width: "auto", padding: "0 8px" }} title="Vider">
                  Vider
                </button>
              )}
              <button onClick={() => setEditingTrigger(trigger)} style={{ ...iconButtonStyle, width: "auto", padding: "0 8px" }}>
                Éditer
              </button>
            </div>
          </div>
        );
      })}

      {editingTrigger && (
        <InteractionScriptEditor
          trigger={editingTrigger}
          blocks={blocksFor(editingTrigger)}
          ctx={editorCtx}
          onSave={(blocks) => saveBlocks(editingTrigger, blocks)}
          onClose={() => setEditingTrigger(null)}
        />
      )}

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

  if (schema.format === "icon") {
    return <IconPickerField value={value} onChange={(icon) => onChange(icon)} />;
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
