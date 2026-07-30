import { MESSAGE_TYPES, createEnvelope } from "@streamdesk/protocol";
import type { DataSourceValue } from "@streamdesk/shared-types";
import type { DataSourceRegistry } from "../registries/datasource-registry.js";
import type { DataSourcesRepository } from "../db/repositories/datasources.repo.js";
import type { ConnectionRegistry } from "../realtime/connection-registry.js";
import type { PagesRepository } from "../db/repositories/pages.repo.js";
import type { Logger } from "../logging/logger.js";

export type DataSourceHandler = (value: DataSourceValue) => void | Promise<void>;

/**
 * Owns the "latest known value" of every data source and fans out updates
 * to (a) in-process plugin subscribers and (b) any connected Interface
 * currently viewing a page with a widget bound to that data source.
 */
export class DataSourceStore {
  private readonly subscribers = new Map<string, Set<DataSourceHandler>>();

  constructor(
    private readonly registry: DataSourceRegistry,
    private readonly repo: DataSourcesRepository,
    private readonly connections: ConnectionRegistry,
    private readonly pages: PagesRepository,
    private readonly logger: Logger,
  ) {}

  getLatest(dataSourceId: string): DataSourceValue | null {
    return this.repo.getLatest(dataSourceId);
  }

  update(dataSourceId: string, sourceConnectId: string | undefined, value: unknown): DataSourceValue {
    if (!this.registry.get(dataSourceId)) {
      this.logger.warn("Received update for unregistered data source", { dataSourceId });
    }

    const record: DataSourceValue = {
      dataSourceId,
      sourceConnectId,
      value,
      updatedAt: new Date().toISOString(),
      quality: "good",
    };
    this.repo.upsert(record);

    const handlers = this.subscribers.get(dataSourceId);
    if (handlers) {
      for (const handler of handlers) Promise.resolve(handler(record)).catch(() => undefined);
    }

    this.broadcastToBoundWidgets(record);
    return record;
  }

  markUnavailable(dataSourceId: string): void {
    const now = new Date().toISOString();
    this.repo.markUnavailable(dataSourceId, now);
    this.broadcastToBoundWidgets({
      dataSourceId,
      value: null,
      updatedAt: now,
      quality: "unavailable",
    });
  }

  subscribe(dataSourceId: string, handler: DataSourceHandler): () => void {
    if (!this.subscribers.has(dataSourceId)) this.subscribers.set(dataSourceId, new Set());
    this.subscribers.get(dataSourceId)!.add(handler);
    return () => this.subscribers.get(dataSourceId)?.delete(handler);
  }

  /** Pushes server.widget.state.update to every Interface whose current page has a bound widget. */
  private broadcastToBoundWidgets(value: DataSourceValue): void {
    for (const page of this.pages.list()) {
      const boundWidgets = page.widgets.filter((widget) =>
        widget.bindings?.some((binding) => binding.dataSourceId === value.dataSourceId),
      );
      if (boundWidgets.length === 0) continue;

      const interfacesOnPage = this.connections.interfacesOnPage(page.id);
      if (interfacesOnPage.length === 0) continue;

      for (const widget of boundWidgets) {
        for (const binding of widget.bindings ?? []) {
          if (binding.dataSourceId !== value.dataSourceId) continue;
          const envelope = createEnvelope({
            type: MESSAGE_TYPES.SERVER_WIDGET_STATE_UPDATE,
            source: { role: "server", instanceId: "server" },
            payload: {
              pageId: page.id,
              widgetId: widget.id,
              property: binding.property,
              dataSourceId: value.dataSourceId,
              value: value.value,
              quality: value.quality,
              updatedAt: value.updatedAt,
            },
          });
          for (const conn of interfacesOnPage) {
            this.connections.sendToInterface(conn.interfaceId, envelope);
          }
        }
      }
    }
  }
}
