import { randomUUID } from "node:crypto";
import { CURRENT_PAGE_SCHEMA_VERSION, type DeckPage } from "@streamdesk/shared-types";
import type { Runtime } from "../core/runtime.js";

/**
 * Creates a first "Accueil" page on a brand-new install so the full flow
 * (press -> action -> Connect/Server -> result -> data source -> Interface
 * update) is demonstrable immediately after `pnpm dev`, without requiring
 * manual admin setup first. Only runs when no pages exist yet.
 */
export function seedDefaultPageIfEmpty(runtime: Runtime): void {
  if (runtime.repos.pages.list().length > 0) return;

  const now = new Date().toISOString();
  const page: DeckPage = {
    schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
    id: randomUUID(),
    name: "Accueil",
    slug: "home",
    grid: { columns: 4, rowHeight: 110, gap: 12 },
    widgets: [
      {
        id: randomUUID(),
        widgetType: "core.button",
        pluginId: "core",
        position: { column: 0, row: 0, columnSpan: 1, rowSpan: 1 },
        properties: { label: "Bonjour", icon: { source: "iconify", id: "mdi:hand-wave" } },
        interactions: [
          {
            trigger: "press",
            blocks: [
              {
                id: randomUUID(),
                kind: "action",
                actionId: "core.log.write",
                input: {
                  level: { kind: "literal", value: "info" },
                  message: { kind: "literal", value: "Bonjour depuis StreamDesk !" },
                },
                target: { mode: "automatic" },
              },
            ],
          },
        ],
      },
      {
        id: randomUUID(),
        widgetType: "core.button",
        pluginId: "core",
        position: { column: 1, row: 0, columnSpan: 1, rowSpan: 1 },
        properties: { label: "Compteur +1", icon: { source: "iconify", id: "mdi:plus" } },
        interactions: [
          {
            trigger: "press",
            blocks: [{ id: randomUUID(), kind: "action", actionId: "example.counter.increment", input: {} }],
          },
        ],
      },
      {
        id: randomUUID(),
        widgetType: "core.text",
        pluginId: "core",
        position: { column: 2, row: 0, columnSpan: 1, rowSpan: 1 },
        properties: { label: "Compteur", format: "{value}" },
        bindings: [{ property: "value", dataSourceId: "example.counter.value" }],
      },
      {
        id: randomUUID(),
        widgetType: "core.text",
        pluginId: "core",
        position: { column: 3, row: 0, columnSpan: 1, rowSpan: 1 },
        properties: { label: "Connect", format: "{value}" },
        bindings: [{ property: "value", dataSourceId: "connect.online" }],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  runtime.repos.pages.upsert(page);
  runtime.logger.info("Seeded default page", { pageId: page.id, slug: page.slug });
}
