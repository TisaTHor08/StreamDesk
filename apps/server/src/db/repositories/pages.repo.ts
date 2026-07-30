import type Database from "better-sqlite3";
import type { DeckPage } from "@streamdesk/shared-types";

type PageRow = {
  id: string;
  slug: string;
  name: string;
  schema_version: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function rowToPage(row: PageRow): DeckPage {
  return JSON.parse(row.content) as DeckPage;
}

export class PagesRepository {
  constructor(private readonly db: Database.Database) {}

  list(): DeckPage[] {
    const rows = this.db.prepare("SELECT * FROM pages ORDER BY created_at ASC").all() as PageRow[];
    return rows.map(rowToPage);
  }

  getById(id: string): DeckPage | null {
    const row = this.db.prepare("SELECT * FROM pages WHERE id = ?").get(id) as PageRow | undefined;
    return row ? rowToPage(row) : null;
  }

  getBySlug(slug: string): DeckPage | null {
    const row = this.db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug) as
      | PageRow
      | undefined;
    return row ? rowToPage(row) : null;
  }

  upsert(page: DeckPage): void {
    this.db
      .prepare(
        `INSERT INTO pages (id, slug, name, schema_version, content, created_at, updated_at)
         VALUES (@id, @slug, @name, @schema_version, @content, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           slug = excluded.slug,
           name = excluded.name,
           schema_version = excluded.schema_version,
           content = excluded.content,
           updated_at = excluded.updated_at`,
      )
      .run({
        id: page.id,
        slug: page.slug,
        name: page.name,
        schema_version: page.schemaVersion,
        content: JSON.stringify(page),
        created_at: page.createdAt,
        updated_at: page.updatedAt,
      });
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM pages WHERE id = ?").run(id);
  }
}
