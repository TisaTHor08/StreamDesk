import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { createLogger } from "./logging/logger.js";
import { openDatabase } from "./db/client.js";
import { Runtime } from "./core/runtime.js";
import { loadPlugins } from "./plugins/loader.js";
import { seedDefaultPageIfEmpty } from "./bootstrap/seed.js";
import { buildApp } from "./http/app.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, "server", "server");

  logger.info("Starting StreamDesk server", {
    dataDir: config.dataDir,
    pluginsDir: config.pluginsDir,
    port: config.port,
  });

  const db = openDatabase(config.dbPath, logger);
  const runtime = new Runtime(db, config, logger);

  await loadPlugins(runtime);
  seedDefaultPageIfEmpty(runtime);

  const interfaceDistDir = process.env.INTERFACE_DIST_DIR ?? resolve("../interface/dist");
  const app = await buildApp(runtime, interfaceDistDir);

  await app.listen({ host: config.host, port: config.port });
  logger.info("StreamDesk server listening", { host: config.host, port: config.port });

  const shutdown = async (signal: string) => {
    logger.info("Shutting down", { signal });
    await app.close();
    db.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Fatal error starting StreamDesk server:", error);
  process.exit(1);
});
