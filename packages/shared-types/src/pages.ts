import type { InteractionBlock } from "./interaction-script.js";

export type GridPosition = {
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
};

export type WidgetBindingTransform = {
  type: string;
  options?: Record<string, unknown>;
};

/** Binds a widget property to a live data source value. */
export type WidgetBinding = {
  property: string;
  dataSourceId: string;
  transform?: WidgetBindingTransform;
};

/**
 * "change" is for continuous-value widgets (sliders, dials): fired with a
 * live `inputOverride` as the value moves, rather than in response to a
 * discrete tap like the other three triggers.
 */
export type WidgetInteractionTrigger = "press" | "release" | "longPress" | "change";

/**
 * Wires a widget's trigger to a small visual script (see
 * interaction-script.ts) — a sequence of blocks (actions, conditionals,
 * loops, waits, variable reads/writes) run in order on the Server when the
 * trigger fires. Each trigger a widget declares gets exactly one script;
 * a single "action" block behaves exactly like V1's old one-action-per-
 * trigger model.
 */
export type WidgetInteraction = {
  trigger: WidgetInteractionTrigger;
  blocks: InteractionBlock[];
};

export type WidgetStyle = {
  background?: string;
  activeBackground?: string;
  textColor?: string;
  borderRadius?: string;
  icon?: string;
};

export type WidgetInstance = {
  id: string;
  widgetType: string;
  pluginId: string;
  position: GridPosition;
  properties: Record<string, unknown>;
  bindings?: WidgetBinding[];
  interactions?: WidgetInteraction[];
  style?: WidgetStyle;
};

export type DeckPageGrid = {
  columns: number;
  rowHeight: number;
  gap: number;
};

export type DeckPage = {
  schemaVersion: string;
  id: string;
  name: string;
  slug: string;
  grid: DeckPageGrid;
  widgets: WidgetInstance[];
  createdAt: string;
  updatedAt: string;
};

export const CURRENT_PAGE_SCHEMA_VERSION = "1";
