import type { Runtime } from "../core/runtime.js";
import type { InteractionVariable } from "@streamdesk/shared-types";

/** Data source id a variable is exposed under — read-only, mirrors its live value. */
export function variableDataSourceId(variableId: string): string {
  return `variable.${variableId}`;
}

/** Registers (or re-registers, e.g. after a rename) the synthetic data
 * source that mirrors one variable's live value, and pushes its current
 * value immediately so already-bound widgets don't wait for the next
 * `setVariable`/`changeVariable` block to show the right thing. */
export function registerVariableDataSource(runtime: Runtime, variable: InteractionVariable): void {
  runtime.dataSourceDefinitions.register({
    id: variableDataSourceId(variable.id),
    pluginId: "core",
    displayName: `Variable : ${variable.name}`,
    valueSchema: { description: "Valeur courante de la variable, type libre (texte/nombre/booléen)." },
    updateMode: "push",
  });
  runtime.dataSources.update(variableDataSourceId(variable.id), undefined, variable.currentValue);
}

/** Called once at startup so every variable created in a previous run is
 * immediately usable (registered + its last known value republished)
 * without waiting for a script to touch it again. */
export function registerAllVariableDataSources(runtime: Runtime): void {
  for (const variable of runtime.repos.variables.list()) {
    registerVariableDataSource(runtime, variable);
  }
}
