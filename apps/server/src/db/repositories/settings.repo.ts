import type Database from "better-sqlite3";

/** Key of the setting controlling which page slug the Deck loads by default
 * when an Interface connects without requesting a specific page. */
const DEFAULT_PAGE_SLUG_KEY = "defaultPageSlug";

/** Falls back to "home" so a brand-new install (or one where the setting was
 * never touched) keeps today's behaviour without any migration/seed step. */
const DEFAULT_PAGE_SLUG_FALLBACK = "home";

/**
 * Generic key/value store for server-wide settings (the `settings` table has
 * existed in the schema since V1 but had no repository consuming it yet).
 * Values are stored as JSON so any future setting can reuse this table
 * without a migration.
 */
export class SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  get<T>(key: string): T | null {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    return row ? (JSON.parse(row.value) as T) : null;
  }

  set(key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .run(key, JSON.stringify(value), new Date().toISOString());
  }

  /** Slug of the page an Interface lands on when it connects without asking
   * for a specific page/slug — configurable in the admin's "Pages" view. */
  getDefaultPageSlug(): string {
    return this.get<string>(DEFAULT_PAGE_SLUG_KEY) ?? DEFAULT_PAGE_SLUG_FALLBACK;
  }

  setDefaultPageSlug(slug: string): void {
    this.set(DEFAULT_PAGE_SLUG_KEY, slug);
  }
}
