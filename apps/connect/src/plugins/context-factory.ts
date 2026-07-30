import os from "node:os";
import type { ConnectPluginContext } from "@streamdesk/connect-sdk";
import type { ConnectConfig } from "../config.js";
import type { Logger } from "../logging/logger.js";
import type { ConnectClient } from "../ws/client.js";
import type { CapabilityRegistry } from "../core/capability-registry.js";
import type { ActionHandlerRegistry } from "../core/action-handlers.js";
import { createFilePluginStorage } from "../storage/file-plugin-storage.js";

export function createConnectPluginContext(
  config: ConnectConfig,
  client: ConnectClient,
  capabilities: CapabilityRegistry,
  actionHandlers: ActionHandlerRegistry,
  logger: Logger,
  pluginId: string,
  version: string,
): ConnectPluginContext {
  return {
    plugin: { id: pluginId, version },

    capabilities: {
      register: (capability) => capabilities.register(capability),
    },

    actions: {
      registerHandler: (actionId, handler) => actionHandlers.register(actionId, handler),
    },

    events: {
      publish: async (eventType, payload) => {
        client.publishEvent(eventType, payload);
      },
    },

    dataSources: {
      publish: async (dataSourceId, value) => {
        client.publishDataSource(dataSourceId, value);
      },
    },

    storage: createFilePluginStorage(config.dataDir, pluginId),
    logger: logger.child(pluginId).toPluginLogger(),

    system: {
      platform: config.platform,
      architecture: config.architecture,
      hostname: os.hostname(),
    },
  };
}
