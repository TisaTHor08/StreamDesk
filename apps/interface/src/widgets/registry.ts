import type { PresetDefinition, ThemeDefinition, WidgetDefinition } from "@streamdesk/interface-sdk";

class Registry<T> {
  private readonly items = new Map<string, T>();

  constructor(private readonly keyOf: (item: T) => string) {}

  register(item: T): void {
    this.items.set(this.keyOf(item), item);
  }

  get(key: string): T | undefined {
    return this.items.get(key);
  }

  list(): T[] {
    return [...this.items.values()];
  }
}

export const widgetRegistry = new Registry<WidgetDefinition>((w) => w.type);
export const presetRegistry = new Registry<PresetDefinition>((p) => p.id);
export const themeRegistry = new Registry<ThemeDefinition>((t) => t.id);
