import type Database from "better-sqlite3";
import type { ServerConfig } from "../config.js";
import type { Logger } from "../logging/logger.js";
import { createRepositories, type Repositories } from "../db/repositories/index.js";
import { ActionRegistry } from "../registries/action-registry.js";
import { EventRegistry } from "../registries/event-registry.js";
import { DataSourceRegistry } from "../registries/datasource-registry.js";
import { CapabilityIndex } from "../registries/capability-index.js";
import { ConnectionRegistry } from "../realtime/connection-registry.js";
import { ActionRouter } from "./action-router.js";
import { EventBus } from "./event-bus.js";
import { DataSourceStore } from "./datasource-store.js";
import { InteractionEngine } from "./interaction-engine.js";

/**
 * Central composition root wiring the database, registries, and live
 * connection state together. One Runtime instance per running Server
 * process. Passed down to the HTTP routes, WebSocket handlers, and every
 * plugin's context so there is exactly one source of truth.
 */
export class Runtime {
  readonly repos: Repositories;
  readonly actions = new ActionRegistry();
  readonly events: EventRegistry;
  readonly dataSourceDefinitions = new DataSourceRegistry();
  readonly capabilities = new CapabilityIndex();
  readonly connections = new ConnectionRegistry();
  readonly router: ActionRouter;
  readonly eventBus: EventBus;
  readonly dataSources: DataSourceStore;
  readonly interactionEngine: InteractionEngine;

  constructor(
    readonly db: Database.Database,
    readonly config: ServerConfig,
    readonly logger: Logger,
  ) {
    this.repos = createRepositories(db);
    this.events = new EventRegistry();

    this.router = new ActionRouter(
      this.actions,
      this.capabilities,
      this.connections,
      this.repos.executions,
      this.repos.plugins,
      logger.child("server", "action-router"),
      config.actionTimeoutMs,
    );

    this.eventBus = new EventBus(this.events, this.repos.events, logger.child("server", "event-bus"));

    this.dataSources = new DataSourceStore(
      this.dataSourceDefinitions,
      this.repos.dataSources,
      this.connections,
      this.repos.pages,
      logger.child("server", "datasource-store"),
    );

    this.interactionEngine = new InteractionEngine(
      this.router,
      this.repos.variables,
      this.dataSources,
      logger.child("server", "interaction-engine"),
    );
  }
}
