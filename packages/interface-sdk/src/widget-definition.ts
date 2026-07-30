import type { JsonSchema, WidgetBinding, WidgetInteraction, WidgetInteractionTrigger } from "@streamdesk/shared-types";
import type { ComponentType } from "react";

/** Props passed to a widget's render component by the Interface renderer. */
export type WidgetRenderProps = {
  widgetId: string;
  properties: Record<string, unknown>;
  /** Resolved values for each declared binding, keyed by widget property name. */
  boundValues: Record<string, unknown>;
  active: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onRelease?: () => void;
  onLongPress?: () => void;
  /**
   * Fires the widget's configured interaction for `trigger`, optionally
   * overriding part of its persisted `input` for this one call. Exists for
   * continuous-value widgets (sliders, dials) that need to report a live
   * value the operator just set — the Server still owns which action runs
   * and where it's routed, this only ever supplies a value.
   */
  onInteract?: (trigger: WidgetInteractionTrigger, inputOverride?: Record<string, unknown>) => void;
};

/**
 * Declarative widget contract a plugin registers on the Interface side.
 * V1 widgets are declarative-only (a React component + a properties
 * schema for the admin editor); a future "custom component" mode with
 * proper isolation is intentionally deferred (see ROADMAP.md).
 */
export type WidgetDefinition = {
  type: string;
  pluginId: string;
  displayName: string;
  description?: string;
  /** Groups this widget under a heading in the editor's palette (e.g. "Audio", "Système"). Defaults to the plugin's display name. */
  category?: string;
  propertiesSchema: JsonSchema;
  defaultSize: { columnSpan: number; rowSpan: number };
  component: ComponentType<WidgetRenderProps>;
  /**
   * "discrete" (default): the DeckGrid wrapper owns press/release/longPress
   * pointer handling, as for a button. "continuous": the wrapper attaches
   * no pointer handlers at all and the component drives `onInteract`
   * itself — for sliders/dials that need to report a live value on their
   * own schedule rather than in response to a single tap.
   */
  interactionMode?: "discrete" | "continuous";
};

export type PresetDefinition = {
  id: string;
  pluginId: string;
  displayName: string;
  description?: string;
  /** Groups this preset under a heading in the editor's palette. Defaults to the plugin's display name. */
  category?: string;
  /** Widget instances (without ids) to instantiate when the preset is applied. */
  widgets: Array<{
    widgetType: string;
    properties: Record<string, unknown>;
    defaultSize: { columnSpan: number; rowSpan: number };
    /** Position relative to the preset's own top-left corner, in grid cells (0,0 = first cell). */
    offset?: { column: number; row: number };
    bindings?: WidgetBinding[];
    interactions?: WidgetInteraction[];
  }>;
};

export type ThemeDefinition = {
  id: string;
  pluginId: string;
  displayName: string;
  mode: "light" | "dark";
  /** CSS custom property overrides, e.g. { "--deck-accent": "#ff6600" }. */
  tokens: Record<string, string>;
};
