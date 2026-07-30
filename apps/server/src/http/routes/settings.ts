import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Runtime } from "../../core/runtime.js";

const settingsInputSchema = z.object({
  defaultPageSlug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
});

/**
 * Server-wide settings, currently just `defaultPageSlug`: the page an
 * Interface lands on when it connects without asking for a specific page
 * (see `server.ws.interface-connection.sendPageSnapshot`). Defaults to
 * "home" and is editable from the admin's "Pages" view.
 */
export async function registerSettingsRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  app.get("/api/settings", async () => ({
    defaultPageSlug: runtime.repos.settings.getDefaultPageSlug(),
  }));

  app.put("/api/settings", async (request, reply) => {
    const parsed = settingsInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "VALIDATION_FAILED", details: parsed.error.flatten() });

    if (!runtime.repos.pages.getBySlug(parsed.data.defaultPageSlug)) {
      return reply.code(400).send({ error: "PAGE_NOT_FOUND", message: "Aucune page avec ce slug" });
    }

    runtime.repos.settings.setDefaultPageSlug(parsed.data.defaultPageSlug);
    return { defaultPageSlug: parsed.data.defaultPageSlug };
  });
}
