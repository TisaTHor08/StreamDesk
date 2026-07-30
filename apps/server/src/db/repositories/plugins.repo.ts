import type Database from "better-sqlite3";
import type { InstalledPlugin, PluginManifest, PluginRuntimeState } from "@streamdesk/plugin-manifest";

type PluginRow = {
  id: string;
  manifest: string;
  directory: string;
  state: string;
  last_error: string | null;
  installed_at: string;
  updated_at: string;
};

function rowToPlugin(row: PluginRow): InstalledPlugin {
  return {
    manifest: JSON.parse(row.manifest) as PluginManifest,
    directory: row.directory,
    state: row.state as PluginRuntimeState,
    lastError: row.last_error ?? undefined,
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}

export class PluginsRepository {
  constructor(private readonly db: Database.Database) {}

  list(): InstalledPlugin[] {
    return (this.db.prepare("SELECT * FROM plugins ORDER BY id ASC").all() as PluginRow[]).map(rowToPlugin);
  }

  getById(id: string): InstalledPlugin | null {
    const row = this.db.prepare("SELECT * FROM plugins WHERE id = ?").get(id) as PluginRow | undefined;
    return row ? rowToPlugin(row) : null;
  }

  upsert(plugin: InstalledPlugin): void {
    this.db
      .prepare(
        `INSERT INTO plugins (id, manifest, directory, state, last_error, installed_at, updated_at)
         VALUES (@id, @manifest, @directory, @state, @last_error, @installed_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           manifest = excluded.manifest,
           directory = excluded.directory,
           state = excluded.state,
           last_error = excluded.last_error,
           updated_at = excluded.updated_at`,
      )
      .run({
        id: plugin.manifest.id,
        manifest: JSON.stringify(plugin.manifest),
        directory: plugin.directory,
        state: plugin.state,
        last_error: plugin.lastError ?? null,
        installed_at: plugin.installedAt,
        updated_at: plugin.updatedAt,
      });
  }

  setState(id: string, state: PluginRuntimeState, lastError: string | null, now: string): void {
    this.db
      .prepare("UPDATE plugins SET state = ?, last_error = ?, updated_at = ? WHERE id = ?")
      .run(state, lastError, now, id);
  }
}
