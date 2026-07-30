import { randomUUID } from "node:crypto";
import type { ServerPluginContext } from "@streamdesk/server-sdk";
import type { Runtime } from "../core/runtime.js";

export function createServerPluginContext(runtime: Runtime, pluginId: string, version: string): ServerPluginContext {
  return {
    plugin: { id: pluginId, version },

    actions: {
      register: (definition, handler) => runtime.actions.register(definition, handler),
      execute: (request) => runtime.router.execute(request),
    },

    events: {
      register: (definition) => runtime.events.register(definition),
      publish: async (event) => {
        runtime.eventBus.publish(event);
      },
      subscribe: (eventType, handler) => runtime.eventBus.subscribe(eventType, handler),
    },

    dataSources: {
      register: (definition) => runtime.dataSourceDefinitions.register(definition),
      getLatest: async (dataSourceId) => runtime.dataSources.getLatest(dataSourceId),
      subscribe: (dataSourceId, handler) => runtime.dataSources.subscribe(dataSourceId, handler),
      publish: async (dataSourceId, value) => {
        runtime.dataSources.update(dataSourceId, undefined, value);
      },
    },

    storage: {
      get: async (key) => runtime.repos.pluginStorage.get(pluginId, key),
      set: async (key, value) => runtime.repos.pluginStorage.set(pluginId, key, value),
      delete: async (key) => runtime.repos.pluginStorage.delete(pluginId, key),
      keys: async () => runtime.repos.pluginStorage.keys(pluginId),
    },

    logger: runtime.logger.child("plugin", pluginId).toPluginLogger(),
  };
}

/** Helper so plugin handlers/tests can mint execution ids consistently. */
export function newExecutionId(): string {
  return randomUUID();
}
