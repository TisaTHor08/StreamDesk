import { activate as activateExamplePlugin } from "../../../../plugins/example-plugin/interface/index.js";
import { createInterfacePluginContext } from "./context.js";

/**
 * V1's statically-linked "plugin loader" for the Interface side: every
 * Interface-contributing plugin the operator has installed under
 * /plugins is imported here directly at build time. A real dynamic loader
 * (fetching and evaluating plugin bundles served by the Server) is left
 * for a later version — see ROADMAP.md.
 */
export function registerInterfacePlugins(): void {
  activateExamplePlugin(createInterfacePluginContext("example-plugin", "1.0.0"));
}
