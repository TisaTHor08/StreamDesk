import type { InterfacePluginContext } from "@streamdesk/interface-sdk";
import { widgetRegistry, presetRegistry, themeRegistry } from "./registry.js";

/**
 * Builds a real InterfacePluginContext for a given plugin id. Used both for
 * StreamDesk's own built-in widgets ("core") and for actual plugins
 * (example-plugin). See ARCHITECTURE.md for why, in V1, Interface plugin
 * modules are imported statically at build time rather than fetched and
 * loaded dynamically at runtime.
 */
export function createInterfacePluginContext(pluginId: string, version: string): InterfacePluginContext {
  return {
    plugin: { id: pluginId, version },
    widgets: { register: (definition) => widgetRegistry.register(definition) },
    presets: { register: (definition) => presetRegistry.register(definition) },
    themes: { register: (definition) => themeRegistry.register(definition) },
  };
}
