import type { ActionTarget } from "./actions.js";

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

export type WidgetInteractionTrigger = "press" | "release" | "longPress";

/** Wires a widget's user interaction to an action execution. */
export type WidgetInteraction = {
  trigger: WidgetInteractionTrigger;
  actionId: string;
  input: Record<string, unknown>;
  target?: ActionTarget;
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
