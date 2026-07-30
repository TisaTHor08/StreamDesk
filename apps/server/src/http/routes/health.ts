import type { FastifyInstance } from "fastify";
import type { Runtime } from "../../core/runtime.js";

const SERVER_VERSION = "0.1.0";
const startedAt = Date.now();

export async function registerHealthRoutes(app: FastifyInstance, _runtime: Runtime): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ready", async () => ({ status: "ready", uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) }));

  app.get("/api/version", async () => ({
    version: SERVER_VERSION,
    protocolVersion: "1",
    pluginApiVersion: "1",
  }));
}
