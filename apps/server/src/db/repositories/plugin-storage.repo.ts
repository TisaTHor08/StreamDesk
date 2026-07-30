import type Database from "better-sqlite3";

/** Backing store for the `storage` object exposed by the Server SDK to plugins. */
export class PluginStorageRepository {
  constructor(private readonly db: Database.Database) {}

  get(pluginId: string, key: string): unknown | null {
    const row = this.db
      .prepare("SELECT value FROM plugin_storage WHERE plugin_id = ? AND key = ?")
      .get(pluginId, key) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  }

  set(pluginId: string, key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT INTO plugin_storage (plugin_id, key, value, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(plugin_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(pluginId, key, JSON.stringify(value), new Date().toISOString());
  }

  delete(pluginId: string, key: string): void {
    this.db.prepare("DELETE FROM plugin_storage WHERE plugin_id = ? AND key = ?").run(pluginId, key);
  }

  keys(pluginId: string): string[] {
    return (
      this.db.prepare("SELECT key FROM plugin_storage WHERE plugin_id = ?").all(pluginId) as {
        key: string;
      }[]
    ).map((row) => row.key);
  }
}

/** Backing store for admin-configured `plugin_settings` (server.plugin.configuration.update). */
export class PluginSettingsRepository {
  constructor(private readonly db: Database.Database) {}

  get(pluginId: string): Record<string, unknown> {
    const row = this.db.prepare("SELECT settings FROM plugin_settings WHERE plugin_id = ?").get(pluginId) as
      | { settings: string }
      | undefined;
    return row ? JSON.parse(row.settings) : {};
  }

  set(pluginId: string, settings: Record<string, unknown>): void {
    this.db
      .prepare(
        `INSERT INTO plugin_settings (plugin_id, settings, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(plugin_id) DO UPDATE SET settings = excluded.settings, updated_at = excluded.updated_at`,
      )
      .run(pluginId, JSON.stringify(settings), new Date().toISOString());
  }
}
