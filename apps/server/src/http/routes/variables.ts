import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { InteractionVariable } from "@streamdesk/shared-types";
import type { Runtime } from "../../core/runtime.js";
import { registerVariableDataSource, variableDataSourceId } from "../../bootstrap/register-variable-data-sources.js";

const scalarSchema = z.union([z.string(), z.number(), z.boolean()]);

const createSchema = z.object({
  name: z.string().min(1),
  initialValue: scalarSchema.default(0),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  initialValue: scalarSchema.optional(),
});

/**
 * CRUD for interaction-script variables (see InteractionEngine /
 * interaction-script.ts). Every create/update also (re)registers the
 * matching `variable.<id>` data source and pushes its value, so a widget
 * bound to it updates immediately rather than waiting for a script to run.
 */
export async function registerVariableRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  app.get("/api/variables", async () => runtime.repos.variables.list());

  app.post("/api/variables", async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "VALIDATION_FAILED", details: parsed.error.flatten() });

    const now = new Date().toISOString();
    const variable: InteractionVariable = {
      id: randomUUID(),
      name: parsed.data.name,
      initialValue: parsed.data.initialValue,
      currentValue: parsed.data.initialValue,
      createdAt: now,
      updatedAt: now,
    };
    runtime.repos.variables.create(variable);
    registerVariableDataSource(runtime, variable);
    return reply.code(201).send(variable);
  });

  app.put<{ Params: { id: string } }>("/api/variables/:id", async (request, reply) => {
    const existing = runtime.repos.variables.getById(request.params.id);
    if (!existing) return reply.code(404).send({ error: "VARIABLE_NOT_FOUND" });

    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "VALIDATION_FAILED", details: parsed.error.flatten() });

    runtime.repos.variables.update(request.params.id, parsed.data);
    const updated = runtime.repos.variables.getById(request.params.id)!;
    registerVariableDataSource(runtime, updated);
    return updated;
  });

  /** Resets the live value back to the variable's own `initialValue` — a
   * separate action from `PUT` (which only edits the definition) so a
   * script mid-run and an admin "reset" click can't silently race in a
   * confusing way. */
  app.post<{ Params: { id: string } }>("/api/variables/:id/reset", async (request, reply) => {
    const existing = runtime.repos.variables.getById(request.params.id);
    if (!existing) return reply.code(404).send({ error: "VARIABLE_NOT_FOUND" });

    runtime.repos.variables.setValue(existing.id, existing.initialValue);
    runtime.dataSources.update(variableDataSourceId(existing.id), undefined, existing.initialValue);
    return runtime.repos.variables.getById(existing.id);
  });

  app.delete<{ Params: { id: string } }>("/api/variables/:id", async (request, reply) => {
    const existing = runtime.repos.variables.getById(request.params.id);
    // DataSourceRegistry only supports unregistering an entire plugin's data
    // sources at once, not one id at a time, so the synthetic
    // "variable.<id>" definition is deliberately left registered rather than
    // torn down — harmless, since the editor's variable picker is driven by
    // `/api/variables` (which no longer lists it) rather than the full data
    // source registry. Its value is marked unavailable so any widget still
    // bound to it (from before the deletion) shows a clear "no data" state
    // instead of a stale number.
    if (existing) runtime.dataSources.markUnavailable(variableDataSourceId(existing.id));
    runtime.repos.variables.delete(request.params.id);
    return reply.code(204).send();
  });
}
