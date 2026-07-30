import type { PresetDefinition, ThemeDefinition, WidgetDefinition } from "./widget-definition.js";

export type InterfacePluginContext = {
  plugin: {
    id: string;
    version: string;
  };
  widgets: {
    register(definition: WidgetDefinition): void;
  };
  presets: {
    register(definition: PresetDefinition): void;
  };
  themes: {
    register(definition: ThemeDefinition): void;
  };
};

/** Entry point signature an Interface-side plugin module must default-export. */
export type InterfacePluginModule = {
  activate(context: InterfacePluginContext): void | Promise<void>;
};
