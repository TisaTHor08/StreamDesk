import type { JsonSchema } from "@streamdesk/shared-types";
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
  propertiesSchema: JsonSchema;
  defaultSize: { columnSpan: number; rowSpan: number };
  component: ComponentType<WidgetRenderProps>;
};

export type PresetDefinition = {
  id: string;
  pluginId: string;
  displayName: string;
  description?: string;
  /** Widget instances (without ids) to instantiate when the preset is applied. */
  widgets: Array<{
    widgetType: string;
    properties: Record<string, unknown>;
    defaultSize: { columnSpan: number; rowSpan: number };
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
