import { widgetRegistry } from "../../widgets/registry.js";
import { WIDGET_DND_MIME } from "./GridEditor.js";

/**
 * Sidebar list of every registered widget type (built-in + plugin-provided).
 * Drag an entry onto the canvas to drop it at that exact cell, or click it
 * to append it at the next free row — click-to-add exists because native
 * HTML5 drag-and-drop doesn't work on touch devices, and the admin panel
 * should be just as usable from a tablet as from a desktop browser.
 */
export function WidgetPalette({ onAdd }: { onAdd: (widgetType: string) => void }) {
  const definitions = widgetRegistry.list();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <h2 style={{ fontSize: 13, color: "var(--deck-muted-text)", margin: "0 0 4px" }}>Widgets</h2>
      {definitions.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--deck-muted-text)" }}>Aucun widget enregistré.</p>
      )}
      {definitions.map((def) => (
        <div
          key={def.type}
          draggable
          onDragStart={(e) => e.dataTransfer.setData(WIDGET_DND_MIME, def.type)}
          onClick={() => onAdd(def.type)}
          title="Glisser sur la grille, ou cliquer pour ajouter"
          style={{
            background: "var(--widget-background)",
            border: "1px solid var(--widget-border)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            cursor: "grab",
            userSelect: "none",
          }}
        >
          {def.displayName}
        </div>
      ))}
    </div>
  );
}
