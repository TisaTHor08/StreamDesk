import type { EventDefinition } from "@streamdesk/shared-types";

export class EventRegistry {
  private readonly events = new Map<string, EventDefinition>();

  register(definition: EventDefinition): void {
    this.events.set(definition.id, definition);
  }

  unregisterByPlugin(pluginId: string): void {
    for (const [id, def] of this.events) {
      if (def.pluginId === pluginId) this.events.delete(id);
    }
  }

  get(eventType: string): EventDefinition | undefined {
    return this.events.get(eventType);
  }

  list(): EventDefinition[] {
    return [...this.events.values()];
  }
}
