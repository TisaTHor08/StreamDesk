import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { Runtime } from "../core/runtime.js";
import { handleInterfaceConnection } from "./interface-connection.js";
import { handleConnectConnection } from "./connect-connection.js";

export async function registerWebSocketRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  app.get("/ws/interface", { websocket: true }, (socket: WebSocket) => {
    runtime.logger.debug("New interface WebSocket connection");
    handleInterfaceConnection(socket, runtime);
  });

  app.get("/ws/connect", { websocket: true }, (socket: WebSocket) => {
    runtime.logger.debug("New connect WebSocket connection");
    handleConnectConnection(socket, runtime);
  });
}
