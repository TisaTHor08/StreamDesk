import { createServer } from "node:http";
import type { ConnectConfig } from "./config.js";
import type { Logger } from "./logging/logger.js";

/** Tiny dependency-free HTTP server exposing GET /health for this Connect instance. */
export function startHealthServer(config: ConnectConfig, logger: Logger): void {
  const server = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  server.listen(config.healthPort, () => {
    logger.info("Connect health endpoint listening", { port: config.healthPort });
  });
}
