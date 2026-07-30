import type {
  ActionDefinition,
  ActionExecutionRequest,
  ActionExecutionResult,
  DataSourceDefinition,
  DataSourceValue,
  EventDefinition,
  PublishedEvent,
} from "@streamdesk/shared-types";
import type { PluginLogger } from "./logger.js";
import type { PluginStorage } from "./storage.js";

export type Unsubscribe = () => void;

/** Handler a plugin registers to actually execute a `server`-located action. */
export type ActionHandler = (
  request: ActionExecutionRequest,
) => Promise<Pick<ActionExecutionResult, "status" | "output" | "error">>;

export type EventHandler = (event: PublishedEvent) => void | Promise<void>;

export type DataSourceHandler = (value: DataSourceValue) => void | Promise<void>;

export type ServerPluginContext = {
  plugin: {
    id: string;
    version: string;
  };
  actions: {
    register(definition: ActionDefinition, handler: ActionHandler): void;
    execute(request: ActionExecutionRequest): Promise<ActionExecutionResult>;
  };
  events: {
    register(definition: EventDefinition): void;
    publish(event: Omit<PublishedEvent, "eventId" | "timestamp">): Promise<void>;
    subscribe(eventType: string, handler: EventHandler): Unsubscribe;
  };
  dataSources: {
    register(definition: DataSourceDefinition): void;
    getLatest(dataSourceId: string): Promise<DataSourceValue | null>;
    subscribe(dataSourceId: string, handler: DataSourceHandler): Unsubscribe;
    /**
     * Pushes a new value for a data source this plugin owns (e.g. a
     * server-computed counter). Not part of the original spec table in
     * PLUGIN_API.md's section 16 draft, but required for any `computed` or
     * server-managed data source to actually produce values — see
     * ARCHITECTURE.md "Deviations from the initial spec".
     */
    publish(dataSourceId: string, value: unknown): Promise<void>;
  };
  storage: PluginStorage;
  logger: PluginLogger;
};

/** Entry point signature a Server-side plugin module must default-export. */
export type ServerPluginModule = {
  activate(context: ServerPluginContext): void | Promise<void>;
  deactivate?(context: ServerPluginContext): void | Promise<void>;
};
