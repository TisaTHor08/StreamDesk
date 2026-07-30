import type { FastifyInstance } from "fastify";
import type { Runtime } from "../../core/runtime.js";

export async function registerPluginRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  app.get("/api/plugins", async () => runtime.repos.plugins.list());

  app.post<{ Params: { id: string }; Body: { enabled: boolean } }>(
    "/api/plugins/:id/state",
    async (request, reply) => {
      const plugin = runtime.repos.plugins.getById(request.params.id);
      if (!plugin) return reply.code(404).send({ error: "PLUGIN_NOT_FOUND" });

      const state = request.body.enabled ? "enabled" : "disabled";
      runtime.repos.plugins.setState(request.params.id, state, null, new Date().toISOString());
      runtime.logger.info("Plugin state changed via admin API", { pluginId: request.params.id, state });
      return { id: request.params.id, state };
    },
  );

  app.get("/api/actions", async () => runtime.actions.list());
  app.get("/api/events", async () => runtime.events.list());
  app.get("/api/data-sources", async () => runtime.dataSourceDefinitions.list());
}
