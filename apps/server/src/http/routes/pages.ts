import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CURRENT_PAGE_SCHEMA_VERSION, type DeckPage } from "@streamdesk/shared-types";
import type { Runtime } from "../../core/runtime.js";

const widgetInputSchema = z.object({
  id: z.string().optional(),
  widgetType: z.string(),
  pluginId: z.string(),
  position: z.object({
    column: z.number().int().min(0),
    row: z.number().int().min(0),
    columnSpan: z.number().int().min(1),
    rowSpan: z.number().int().min(1),
  }),
  properties: z.record(z.unknown()).default({}),
  bindings: z
    .array(z.object({ property: z.string(), dataSourceId: z.string(), transform: z.any().optional() }))
    .optional(),
  interactions: z
    .array(
      z.object({
        trigger: z.enum(["press", "release", "longPress"]),
        actionId: z.string(),
        input: z.record(z.unknown()).default({}),
        target: z.object({ mode: z.enum(["automatic", "specific"]), connectId: z.string().optional() }).optional(),
      }),
    )
    .optional(),
  style: z.record(z.unknown()).optional(),
});

const pageInputSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  grid: z
    .object({ columns: z.number().int().positive(), rowHeight: z.number().positive(), gap: z.number().min(0) })
    .default({ columns: 4, rowHeight: 96, gap: 8 }),
  widgets: z.array(widgetInputSchema).default([]),
});

export async function registerPageRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  app.get("/api/pages", async () => runtime.repos.pages.list());

  app.get<{ Params: { id: string } }>("/api/pages/:id", async (request, reply) => {
    const page = runtime.repos.pages.getById(request.params.id);
    if (!page) return reply.code(404).send({ error: "PAGE_NOT_FOUND" });
    return page;
  });

  app.post("/api/pages", async (request, reply) => {
    const parsed = pageInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "VALIDATION_FAILED", details: parsed.error.flatten() });

    const now = new Date().toISOString();
    const page: DeckPage = {
      schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
      id: randomUUID(),
      name: parsed.data.name,
      slug: parsed.data.slug,
      grid: parsed.data.grid,
      widgets: parsed.data.widgets.map((w) => ({ ...w, id: w.id ?? randomUUID(), properties: w.properties ?? {} })),
      createdAt: now,
      updatedAt: now,
    };
    runtime.repos.pages.upsert(page);
    return reply.code(201).send(page);
  });

  app.put<{ Params: { id: string } }>("/api/pages/:id", async (request, reply) => {
    const existing = runtime.repos.pages.getById(request.params.id);
    if (!existing) return reply.code(404).send({ error: "PAGE_NOT_FOUND" });

    const parsed = pageInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "VALIDATION_FAILED", details: parsed.error.flatten() });

    const updated: DeckPage = {
      ...existing,
      name: parsed.data.name,
      slug: parsed.data.slug,
      grid: parsed.data.grid,
      widgets: parsed.data.widgets.map((w) => ({ ...w, id: w.id ?? randomUUID(), properties: w.properties ?? {} })),
      updatedAt: new Date().toISOString(),
    };
    runtime.repos.pages.upsert(updated);

    // Push the new snapshot to any Interface currently viewing this page.
    for (const conn of runtime.connections.interfacesOnPage(updated.id)) {
      runtime.connections.sendToInterface(conn.interfaceId, {
        protocolVersion: "1",
        messageId: randomUUID(),
        type: "server.page.snapshot",
        timestamp: new Date().toISOString(),
        source: { role: "server", instanceId: "server" },
        payload: { page: updated },
      });
    }

    return updated;
  });

  app.delete<{ Params: { id: string } }>("/api/pages/:id", async (request, reply) => {
    runtime.repos.pages.delete(request.params.id);
    return reply.code(204).send();
  });
}
