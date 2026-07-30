import { loadConfig } from "./config.js";
import { createLogger } from "./logging/logger.js";
import { loadOrCreateIdentity } from "./identity.js";
import { CapabilityRegistry } from "./core/capability-registry.js";
import { ActionHandlerRegistry } from "./core/action-handlers.js";
import { ConnectClient } from "./ws/client.js";
import { loadConnectPlugins } from "./plugins/loader.js";
import { startHealthServer } from "./health-server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, "connect");
  const identity = loadOrCreateIdentity(config.dataDir);

  logger.info("Starting StreamDesk Connect", {
    connectId: identity.connectId,
    platform: config.platform,
    architecture: config.architecture,
    serverUrl: config.serverUrl,
  });

  const capabilities = new CapabilityRegistry();
  const actionHandlers = new ActionHandlerRegistry();
  const client = new ConnectClient(config, identity, capabilities, actionHandlers, logger);

  const loadedPlugins = await loadConnectPlugins(config, client, capabilities, actionHandlers, logger);
  client.setLoadedPlugins(loadedPlugins);

  startHealthServer(config, logger);
  client.connect();

  const shutdown = (signal: string) => {
    logger.info("Shutting down", { signal });
    client.close();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Fatal error starting StreamDesk Connect:", error);
  process.exit(1);
});
