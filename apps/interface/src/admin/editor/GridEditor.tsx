import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { DeckPageGrid, GridPosition, WidgetInstance } from "@streamdesk/shared-types";
import { widgetRegistry } from "../../widgets/registry.js";

const DND_MIME = "application/x-streamdesk-widget-type";

type DragState =
  | {
      mode: "move";
      widgetId: string;
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startColumn: number;
      startRow: number;
      stepX: number;
      stepY: number;
      columns: number;
      columnSpan: number;
    }
  | {
      mode: "resize";
      widgetId: string;
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startColumnSpan: number;
      startRowSpan: number;
      stepX: number;
      stepY: number;
      columns: number;
      column: number;
    };

export type GridEditorProps = {
  grid: DeckPageGrid;
  widgets: WidgetInstance[];
  selectedWidgetId: string | null;
  onSelect: (id: string | null) => void;
  onChangePosition: (widgetId: string, position: GridPosition) => void;
  onAddWidget: (widgetType: string, at: { column: number; row: number }) => void;
};

/**
 * Freeform grid canvas: every widget is drag-to-move and drag-to-resize via
 * native Pointer Events (mouse, touch and pen all go through the same code
 * path — no drag-and-drop library dependency, consistent with the rest of
 * this project). Widgets are positioned/sized in grid cells, not pixels,
 * and dragging is intentionally free of collision detection — StreamDesk's
 * grid is a layout aid, not a hard constraint (widgets may overlap if the
 * operator wants that), matching the "not grid-limited" goal from the
 * platform's own pitch.
 */
export function GridEditor({ grid, widgets, selectedWidgetId, onSelect, onChangePosition, onAddWidget }: GridEditorProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  function measureStep() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cellWidth = (rect.width - grid.gap * (grid.columns - 1)) / grid.columns;
    return { rect, stepX: cellWidth + grid.gap, stepY: grid.rowHeight + grid.gap };
  }

  function beginMove(e: ReactPointerEvent<HTMLDivElement>, widget: WidgetInstance) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const measured = measureStep();
    if (!measured) return;
    dragRef.current = {
      mode: "move",
      widgetId: widget.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startColumn: widget.position.column,
      startRow: widget.position.row,
      stepX: measured.stepX,
      stepY: measured.stepY,
      columns: grid.columns,
      columnSpan: widget.position.columnSpan,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(widget.id);
  }

  function beginResize(e: ReactPointerEvent<HTMLDivElement>, widget: WidgetInstance) {
    e.stopPropagation();
    const measured = measureStep();
    if (!measured) return;
    dragRef.current = {
      mode: "resize",
      widgetId: widget.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startColumnSpan: widget.position.columnSpan,
      startRowSpan: widget.position.rowSpan,
      stepX: measured.stepX,
      stepY: measured.stepY,
      columns: grid.columns,
      column: widget.position.column,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(widget.id);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const widget = widgets.find((w) => w.id === drag.widgetId);
    if (!widget) return;

    const deltaX = e.clientX - drag.startClientX;
    const deltaY = e.clientY - drag.startClientY;
    const deltaCol = Math.round(deltaX / drag.stepX);
    const deltaRow = Math.round(deltaY / drag.stepY);

    if (drag.mode === "move") {
      const maxColumn = Math.max(0, drag.columns - drag.columnSpan);
      const nextColumn = Math.min(maxColumn, Math.max(0, drag.startColumn + deltaCol));
      const nextRow = Math.max(0, drag.startRow + deltaRow);
      if (nextColumn !== widget.position.column || nextRow !== widget.position.row) {
        onChangePosition(drag.widgetId, { ...widget.position, column: nextColumn, row: nextRow });
      }
    } else {
      const maxColumnSpan = Math.max(1, drag.columns - drag.column);
      const nextColumnSpan = Math.min(maxColumnSpan, Math.max(1, drag.startColumnSpan + deltaCol));
      const nextRowSpan = Math.max(1, drag.startRowSpan + deltaRow);
      if (nextColumnSpan !== widget.position.columnSpan || nextRowSpan !== widget.position.rowSpan) {
        onChangePosition(drag.widgetId, { ...widget.position, columnSpan: nextColumnSpan, rowSpan: nextRowSpan });
      }
    }
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const widgetType = e.dataTransfer.getData(DND_MIME);
    if (!widgetType) return;
    const measured = measureStep();
    if (!measured) return;
    const column = Math.max(0, Math.min(grid.columns - 1, Math.floor((e.clientX - measured.rect.left) / measured.stepX)));
    const row = Math.max(0, Math.floor((e.clientY - measured.rect.top) / measured.stepY));
    onAddWidget(widgetType, { column, row });
  }

  return (
    <div
      ref={canvasRef}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={(e) => {
        if (e.target === canvasRef.current) onSelect(null);
      }}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
        gridAutoRows: `${grid.rowHeight}px`,
        gap: grid.gap,
        padding: "var(--spacing-md)",
        background: "var(--deck-background)",
        border: "1px dashed var(--widget-border)",
        borderRadius: "var(--widget-radius)",
        minHeight: grid.rowHeight * 4,
      }}
    >
      {widgets.map((widget) => {
        const definition = widgetRegistry.get(widget.widgetType);
        const Component = definition?.component;
        const selected = widget.id === selectedWidgetId;
        return (
          <div
            key={widget.id}
            onPointerDown={(e) => beginMove(e, widget)}
            style={{
              gridColumn: `${widget.position.column + 1} / span ${widget.position.columnSpan}`,
              gridRow: `${widget.position.row + 1} / span ${widget.position.rowSpan}`,
              position: "relative",
              boxShadow: selected ? "0 0 0 2px var(--deck-accent)" : "0 0 0 1px transparent",
              borderRadius: "var(--widget-radius)",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
              {Component ? (
                <Component widgetId={widget.id} properties={widget.properties} boundValues={{}} active={false} />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--deck-danger)",
                    fontSize: 11,
                    textAlign: "center",
                    border: "1px dashed var(--deck-danger)",
                    borderRadius: 8,
                    padding: 4,
                  }}
                >
                  Widget inconnu : {widget.widgetType}
                </div>
              )}
            </div>
            {selected && (
              <div
                onPointerDown={(e) => beginResize(e, widget)}
                title="Glisser pour redimensionner"
                style={{
                  position: "absolute",
                  right: -7,
                  bottom: -7,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--deck-accent)",
                  border: "2px solid var(--deck-background)",
                  cursor: "nwse-resize",
                  touchAction: "none",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const WIDGET_DND_MIME = DND_MIME;
