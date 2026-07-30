import type { ActionDefinition } from "@streamdesk/shared-types";
import type { ActionHandler } from "@streamdesk/server-sdk";

type RegisteredAction = {
  definition: ActionDefinition;
  /** Present only for executionLocation === "server". */
  handler?: ActionHandler;
};

/**
 * In-memory registry of every ActionDefinition contributed by any loaded
 * plugin (Server or Connect side). Connect-executed actions are registered
 * here too (without a handler) purely so the router can validate input and
 * resolve `requiredCapabilities` before routing to a Connect.
 */
export class ActionRegistry {
  private readonly actions = new Map<string, RegisteredAction>();

  register(definition: ActionDefinition, handler?: ActionHandler): void {
    if (this.actions.has(definition.id)) {
      throw new Error(`Action "${definition.id}" is already registered`);
    }
    if (definition.executionLocation === "server" && !handler) {
      throw new Error(`Action "${definition.id}" is server-executed but no handler was provided`);
    }
    this.actions.set(definition.id, { definition, handler });
  }

  unregisterByPlugin(pluginId: string): void {
    for (const [id, action] of this.actions) {
      if (action.definition.pluginId === pluginId) this.actions.delete(id);
    }
  }

  get(actionId: string): RegisteredAction | undefined {
    return this.actions.get(actionId);
  }

  list(): ActionDefinition[] {
    return [...this.actions.values()].map((entry) => entry.definition);
  }
}
