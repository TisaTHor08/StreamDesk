import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { DeckPage, InteractionExpression, WidgetInteraction } from "@streamdesk/shared-types";

type PageRow = {
  id: string;
  slug: string;
  name: string;
  schema_version: string;
  content: string;
  created_at: string;
  updated_at: string;
};

/** Shape of a widget interaction from before the block-script editor
 * existed: one fixed action call, no sequencing/conditionals/loops. */
type LegacyWidgetInteraction = {
  trigger: WidgetInteraction["trigger"];
  actionId: string;
  input?: Record<string, unknown>;
  target?: { mode: "automatic" | "specific"; connectId?: string };
};

function isLegacyInteraction(interaction: unknown): interaction is LegacyWidgetInteraction {
  return (
    typeof interaction === "object" &&
    interaction !== null &&
    "actionId" in interaction &&
    !("blocks" in interaction)
  );
}

function literalExpression(value: unknown): InteractionExpression {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { kind: "literal", value };
  }
  return { kind: "literal", value: JSON.stringify(value ?? null) };
}

/** Upgrades a page loaded from a pre-block-editor install: every
 * `{trigger, actionId, input, target}` interaction becomes a one-block
 * `{trigger, blocks: [{kind:"action", ...}]}` script, so pages created
 * before this feature keep working exactly as before without the operator
 * having to redo anything. New pages are already saved in the new shape,
 * so this is a no-op once a page has been re-saved. */
function normalizeInteractions(page: DeckPage): DeckPage {
  let changed = false;
  const widgets = page.widgets.map((widget) => {
    if (!widget.interactions?.some(isLegacyInteraction)) return widget;
    changed = true;
    const interactions = widget.interactions.map((interaction) => {
      if (!isLegacyInteraction(interaction)) return interaction;
      const input: Record<string, InteractionExpression> = {};
      for (const [key, value] of Object.entries(interaction.input ?? {})) input[key] = literalExpression(value);
      return {
        trigger: interaction.trigger,
        blocks: [{ id: randomUUID(), kind: "action" as const, actionId: interaction.actionId, input, target: interaction.target }],
      };
    });
    return { ...widget, interactions };
  });
  return changed ? { ...page, widgets } : page;
}

function rowToPage(row: PageRow): DeckPage {
  return normalizeInteractions(JSON.parse(row.content) as DeckPage);
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
