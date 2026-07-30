import type { CapabilityDescriptor, PluginLogger, PluginStorage } from "@streamdesk/shared-types";

export type ConnectActionHandler = (input: unknown) => Promise<unknown>;

export type ConnectPluginContext = {
  plugin: {
    id: string;
    version: string;
  };
  capabilities: {
    register(capability: CapabilityDescriptor): void;
  };
  actions: {
    registerHandler(actionId: string, handler: ConnectActionHandler): void;
  };
  events: {
    publish(eventType: string, payload: unknown): Promise<void>;
  };
  dataSources: {
    publish(dataSourceId: string, value: unknown): Promise<void>;
  };
  storage: PluginStorage;
  logger: PluginLogger;
  system: {
    platform: string;
    architecture: string;
    hostname: string;
  };
};

/** Entry point signature a Connect-side plugin module must default-export. */
export type ConnectPluginModule = {
  activate(context: ConnectPluginContext): void | Promise<void>;
  deactivate?(context: ConnectPluginContext): void | Promise<void>;
};
