import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import {
  MESSAGE_TYPES,
  createEnvelope,
  tryParseEnvelope,
  type ConnectRegisterPayload,
  type ServerActionExecutePayload,
  type ServerConnectAcceptedPayload,
} from "@streamdesk/protocol";
import type { ActionExecutionResult } from "@streamdesk/shared-types";
import type { ConnectConfig } from "../config.js";
import type { Logger } from "../logging/logger.js";
import type { ConnectIdentity } from "../identity.js";
import { saveIdentity } from "../identity.js";
import type { CapabilityRegistry } from "../core/capability-registry.js";
import type { ActionHandlerRegistry } from "../core/action-handlers.js";

const RECONNECT_MIN_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

export class ConnectClient {
  private socket: WebSocket | null = null;
  private reconnectDelay = RECONNECT_MIN_DELAY_MS;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private closedByUser = false;
  private readonly startedAt = Date.now();
  private loadedPlugins: string[] = [];

  constructor(
    private readonly config: ConnectConfig,
    private readonly identity: ConnectIdentity,
    private readonly capabilities: CapabilityRegistry,
    private readonly actionHandlers: ActionHandlerRegistry,
    private readonly logger: Logger,
  ) {
    this.capabilities.subscribe(() => this.sendCapabilitiesUpdate());
  }

  setLoadedPlugins(pluginIds: string[]): void {
    this.loadedPlugins = pluginIds;
  }

  connect(): void {
    this.closedByUser = false;
    const url = `${this.config.serverUrl.replace(/\/$/, "")}/ws/connect`;
    this.logger.info("Connecting to server", { url });
    this.socket = new WebSocket(url);

    this.socket.on("open", () => this.handleOpen());
    this.socket.on("message", (raw: Buffer) => this.handleMessage(raw));
    this.socket.on("close", () => this.handleClose());
    this.socket.on("error", (error) => this.logger.warn("WebSocket error", { error: String(error) }));
  }

  close(): void {
    this.closedByUser = true;
    this.stopHeartbeat();
    this.socket?.close();
  }

  publishEvent(eventType: string, payload: unknown): void {
    this.send(
      createEnvelope({
        type: MESSAGE_TYPES.CONNECT_EVENT_PUBLISH,
        source: this.source(),
        payload: { eventType, payload },
      }),
    );
  }

  publishDataSource(dataSourceId: string, value: unknown): void {
    this.send(
      createEnvelope({
        type: MESSAGE_TYPES.CONNECT_DATASOURCE_UPDATE,
        source: this.source(),
        payload: { dataSourceId, value },
      }),
    );
  }

  private sendCapabilitiesUpdate(): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.send(
      createEnvelope({
        type: MESSAGE_TYPES.CONNECT_CAPABILITIES_UPDATE,
        source: this.source(),
        payload: { capabilities: this.capabilities.list() },
      }),
    );
  }

  private handleOpen(): void {
    this.reconnectDelay = RECONNECT_MIN_DELAY_MS;
    this.logger.info("Connected to server, registering", { connectId: this.identity.connectId });

    const payload: ConnectRegisterPayload = {
      connectId: this.identity.connectId,
      name: this.config.name,
      platform: this.config.platform,
      architecture: this.config.architecture,
      version: "0.1.0",
      capabilities: this.capabilities.list(),
      token: this.identity.token ?? undefined,
    };

    this.send(createEnvelope({ type: MESSAGE_TYPES.CONNECT_REGISTER, source: this.source(), payload }));
    this.startHeartbeat();
  }

  private handleMessage(raw: Buffer): void {
    let json: unknown;
    try {
      json = JSON.parse(raw.toString());
    } catch {
      this.logger.warn("Received non-JSON message from server");
      return;
    }

    const parsed = tryParseEnvelope(json);
    if (!parsed.ok) {
      this.logger.warn("Received invalid envelope from server", { error: parsed.error.message });
      return;
    }

    const envelope = parsed.envelope;
    switch (envelope.type) {
      case MESSAGE_TYPES.SERVER_CONNECT_ACCEPTED: {
        const payload = envelope.payload as ServerConnectAcceptedPayload;
        if (payload.token && payload.token !== this.identity.token) {
          this.identity.token = payload.token;
          saveIdentity(this.config.dataDir, this.identity);
          this.logger.info("Stored Connect token issued by server");
        }
        this.sendHealthUpdate();
        break;
      }
      case MESSAGE_TYPES.SERVER_ACTION_EXECUTE: {
        const payload = envelope.payload as ServerActionExecutePayload;
        void this.executeAction(payload);
        break;
      }
      case MESSAGE_TYPES.SERVER_ERROR: {
        this.logger.warn("Server reported an error", { payload: envelope.payload });
        break;
      }
      case MESSAGE_TYPES.SERVER_HEARTBEAT:
      case MESSAGE_TYPES.SERVER_DATASOURCE_SUBSCRIBE:
      case MESSAGE_TYPES.SERVER_PLUGIN_CONFIGURATION_UPDATE:
        break;
      default:
        this.logger.debug("Unhandled message type", { type: envelope.type });
    }
  }

  private async executeAction(request: ServerActionExecutePayload): Promise<void> {
    const startedAt = new Date().toISOString();
    const handler = this.actionHandlers.get(request.actionId);

    let result: ActionExecutionResult;
    if (!handler) {
      result = {
        executionId: request.executionId,
        status: "error",
        error: { code: "ACTION_NOT_FOUND", message: `No local handler for action "${request.actionId}"` },
        startedAt,
        completedAt: new Date().toISOString(),
      };
    } else {
      try {
        const output = await handler(request.input);
        result = { executionId: request.executionId, status: "success", output, startedAt, completedAt: new Date().toISOString() };
      } catch (error) {
        result = {
          executionId: request.executionId,
          status: "error",
          error: {
            code: "ACTION_EXECUTION_FAILED",
            message: error instanceof Error ? error.message : "Unknown error executing action",
          },
          startedAt,
          completedAt: new Date().toISOString(),
        };
      }
    }

    this.send(createEnvelope({ type: MESSAGE_TYPES.CONNECT_ACTION_RESULT, source: this.source(), payload: result }));
  }

  private sendHealthUpdate(): void {
    this.send(
      createEnvelope({
        type: MESSAGE_TYPES.CONNECT_HEALTH_UPDATE,
        source: this.source(),
        payload: {
          uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
          status: "online",
          loadedPlugins: this.loadedPlugins,
        },
      }),
    );
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send(createEnvelope({ type: MESSAGE_TYPES.CONNECT_HEARTBEAT, source: this.source(), payload: {} }));
      this.sendHealthUpdate();
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private handleClose(): void {
    this.stopHeartbeat();
    if (this.closedByUser) return;

    this.logger.warn("Disconnected from server, will retry", { delayMs: this.reconnectDelay });
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_DELAY_MS);
  }

  private send(envelope: ReturnType<typeof createEnvelope>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ ...envelope, messageId: envelope.messageId ?? randomUUID() }));
    }
  }

  private source() {
    return { role: "connect" as const, instanceId: this.identity.connectId };
  }
}
