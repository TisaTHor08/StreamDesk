import type { DataSourceDefinition } from "@streamdesk/shared-types";

export class DataSourceRegistry {
  private readonly dataSources = new Map<string, DataSourceDefinition>();

  register(definition: DataSourceDefinition): void {
    this.dataSources.set(definition.id, definition);
  }

  unregisterByPlugin(pluginId: string): void {
    for (const [id, def] of this.dataSources) {
      if (def.pluginId === pluginId) this.dataSources.delete(id);
    }
  }

  get(dataSourceId: string): DataSourceDefinition | undefined {
    return this.dataSources.get(dataSourceId);
  }

  list(): DataSourceDefinition[] {
    return [...this.dataSources.values()];
  }
}
