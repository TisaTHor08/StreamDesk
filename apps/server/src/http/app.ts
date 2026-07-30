import { existsSync } from "node:fs";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import type { Runtime } from "../core/runtime.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerPageRoutes } from "./routes/pages.js";
import { registerPluginRoutes } from "./routes/plugins.js";
import { registerDeviceRoutes } from "./routes/devices.js";
import { registerPairingRoutes } from "./routes/pairing.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerWebSocketRoutes } from "../ws/ws-server.js";

export async function buildApp(runtime: Runtime, interfaceDistDir?: string): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: runtime.config.corsOrigin });
  await app.register(websocketPlugin);

  await registerHealthRoutes(app, runtime);
  await registerPageRoutes(app, runtime);
  await registerPluginRoutes(app, runtime);
  await registerDeviceRoutes(app, runtime);
  await registerPairingRoutes(app, runtime);
  await registerSettingsRoutes(app, runtime);
  await registerWebSocketRoutes(app, runtime);

  // Serve the built Interface PWA, when present, so the whole system can
  // run from a single `streamdesk-server` process (Scenario C / D).
  if (interfaceDistDir && existsSync(interfaceDistDir)) {
    // wildcard (default true): lets @fastify/static actually serve every
    // built asset (JS/CSS/manifest/icons) at its real path. The
    // notFoundHandler below is only a fallback for SPA routes like
    // /admin/pages/123 that don't correspond to a file on disk.
    await app.register(fastifyStatic, { root: interfaceDistDir });
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.method === "GET" && !request.url.startsWith("/api") && !request.url.startsWith("/ws")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "NOT_FOUND" });
    });
  }

  app.setErrorHandler((error, _request, reply) => {
    runtime.logger.error("Unhandled HTTP error", { error: error.message, stack: error.stack });
    reply.code(500).send({ error: "INTERNAL_ERROR", message: error.message });
  });

  return app;
}
