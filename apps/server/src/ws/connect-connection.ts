import type { WebSocket } from "ws";
import {
  MESSAGE_TYPES,
  createEnvelope,
  tryParseEnvelope,
  type ConnectCapabilitiesUpdatePayload,
  type ConnectDataSourceUpdatePayload,
  type ConnectEventPublishPayload,
  type ConnectHealthUpdatePayload,
  type ConnectRegisterPayload,
} from "@streamdesk/protocol";
import type { ActionExecutionResult } from "@streamdesk/shared-types";
import type { Runtime } from "../core/runtime.js";
import { generateToken, hashToken } from "../security/tokens.js";
import { makeSender, sendError } from "./envelope-io.js";

const SERVER_INSTANCE_ID = "server";

export function handleConnectConnection(socket: WebSocket, runtime: Runtime): void {
  const logger = runtime.logger.child("connect", "unregistered");
  let connectId: string | undefined;
  const send = makeSender(socket);

  socket.on("message", (raw: Buffer) => {
    let json: unknown;
    try {
      json = JSON.parse(raw.toString());
    } catch {
      sendError(socket, "server", SERVER_INSTANCE_ID, "VALIDATION_FAILED", "Message is not valid JSON");
      return;
    }

    const parsed = tryParseEnvelope(json);
    if (!parsed.ok) {
      sendError(socket, "server", SERVER_INSTANCE_ID, parsed.error.code, parsed.error.message);
      return;
    }

    const envelope = parsed.envelope;

    switch (envelope.type) {
      case MESSAGE_TYPES.CONNECT_REGISTER: {
        const payload = envelope.payload as ConnectRegisterPayload;
        connectId = registerConnect(runtime, socket, payload);
        break;
      }
      case MESSAGE_TYPES.CONNECT_CAPABILITIES_UPDATE: {
        if (!connectId) return;
        const payload = envelope.payload as ConnectCapabilitiesUpdatePayload;
        runtime.repos.connects.updateCapabilities(connectId, payload.capabilities, new Date().toISOString());
        runtime.capabilities.setCapabilities(connectId, payload.capabilities);
        break;
      }
      case MESSAGE_TYPES.CONNECT_ACTION_RESULT: {
        const payload = envelope.payload as ActionExecutionResult;
        runtime.router.resolveFromConnect(payload);
        break;
      }
      case MESSAGE_TYPES.CONNECT_EVENT_PUBLISH: {
        if (!connectId) return;
        const payload = envelope.payload as ConnectEventPublishPayload;
        handleEventPublish(runtime, connectId, payload);
        break;
      }
      case MESSAGE_TYPES.CONNECT_DATASOURCE_UPDATE: {
        if (!connectId) return;
        const payload = envelope.payload as ConnectDataSourceUpdatePayload;
        runtime.dataSources.update(payload.dataSourceId, connectId, payload.value);
        break;
      }
      case MESSAGE_TYPES.CONNECT_HEALTH_UPDATE: {
        if (!connectId) return;
        const payload = envelope.payload as ConnectHealthUpdatePayload;
        runtime.repos.connects.touch(connectId, new Date().toISOString(), payload.uptimeSeconds);
        break;
      }
      case MESSAGE_TYPES.CONNECT_HEARTBEAT: {
        if (!connectId) return;
        runtime.repos.connects.touch(connectId, new Date().toISOString());
        send(
          createEnvelope({
            type: MESSAGE_TYPES.SERVER_HEARTBEAT,
            source: { role: "server", instanceId: SERVER_INSTANCE_ID },
            payload: { serverTime: new Date().toISOString() },
          }),
        );
        break;
      }
      default:
        sendError(socket, "server", SERVER_INSTANCE_ID, "UNKNOWN_MESSAGE_TYPE", `Unexpected message type "${envelope.type}" on connect channel`);
    }
  });

  socket.on("close", () => {
    if (!connectId) return;
    runtime.connections.removeConnect(connectId);
    runtime.capabilities.remove(connectId);
    runtime.repos.connects.setStatus(connectId, "offline", new Date().toISOString());
    updateConnectOnlineDataSource(runtime);
    logger.info("Connect disconnected", { connectId });
  });
}

function registerConnect(runtime: Runtime, socket: WebSocket, payload: ConnectRegisterPayload): string {
  const logger = runtime.logger.child("connect", payload.connectId);
  const now = new Date().toISOString();

  const existing = runtime.repos.connects.getById(payload.connectId);
  if (existing?.revoked) {
    sendError(socket, "server", SERVER_INSTANCE_ID, "UNAUTHORIZED", "This Connect has been revoked by the operator");
    socket.close();
    return payload.connectId;
  }

  const storedHash = runtime.repos.connects.getTokenHash(payload.connectId);
  if (storedHash && payload.token && hashToken(payload.token) !== storedHash) {
    sendError(socket, "server", SERVER_INSTANCE_ID, "UNAUTHENTICATED", "Invalid Connect token");
    socket.close();
    return payload.connectId;
  }

  let issuedToken: string | null = null;
  if (!storedHash) {
    issuedToken = generateToken();
  }

  runtime.repos.connects.upsertRegistration(payload, issuedToken ? hashToken(issuedToken) : null, now);
  runtime.connections.addConnect(payload.connectId, makeSender(socket));
  runtime.capabilities.setCapabilities(payload.connectId, payload.capabilities);

  const send = makeSender(socket);
  send(
    createEnvelope({
      type: MESSAGE_TYPES.SERVER_CONNECT_ACCEPTED,
      source: { role: "server", instanceId: SERVER_INSTANCE_ID },
      payload: {
        connectId: payload.connectId,
        token: issuedToken ?? payload.token ?? "",
        serverTime: now,
      },
    }),
  );

  logger.info("Connect registered", { name: payload.name, platform: payload.platform, architecture: payload.architecture });
  updateConnectOnlineDataSource(runtime);
  return payload.connectId;
}

/**
 * `connect.online` is declared by the core-actions plugin's DataSourceDefinition,
 * but its value reflects live WebSocket connection state which only the
 * Server core can see — so the core updates it directly rather than routing
 * through the (connection-registry-blind) plugin SDK. See ARCHITECTURE.md
 * "Deviations from the initial spec".
 */
function updateConnectOnlineDataSource(runtime: Runtime): void {
  const online = runtime.connections.listConnectIds().length > 0;
  runtime.dataSources.update("connect.online", undefined, online);
}

function handleEventPublish(runtime: Runtime, connectId: string, payload: ConnectEventPublishPayload): void {
  const definition = runtime.events.get(payload.eventType);
  if (!definition) {
    runtime.logger.warn("Connect published an unregistered event type", { connectId, eventType: payload.eventType });
    return;
  }
  try {
    runtime.eventBus.publish({
      eventType: payload.eventType,
      sourcePluginId: definition.pluginId,
      sourceConnectId: connectId,
      payload: payload.payload,
    });
  } catch (error) {
    runtime.logger.warn("Failed to publish connect-originated event", {
      connectId,
      eventType: payload.eventType,
      error: String(error),
    });
  }
}
