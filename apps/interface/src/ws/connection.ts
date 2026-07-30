import {
  MESSAGE_TYPES,
  createEnvelope,
  tryParseEnvelope,
  type InterfaceWidgetInteractPayload,
  type ServerInterfaceAcceptedPayload,
  type ServerNotificationPayload,
  type ServerPageSnapshotPayload,
  type ServerWidgetStateUpdatePayload,
} from "@streamdesk/protocol";
import type { DeckPage, WidgetInteractionTrigger } from "@streamdesk/shared-types";
import { loadOrCreateIdentity, persistIdentity, type StoredIdentity } from "./identity.js";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export type BoundValues = Record<string, Record<string, unknown>>; // widgetId -> property -> value

export type ConnectionListener = {
  onStateChange?(state: ConnectionState): void;
  onPage?(page: DeckPage): void;
  onWidgetValue?(widgetId: string, property: string, value: unknown): void;
  onNotification?(notification: ServerNotificationPayload): void;
};

function wsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/interface`;
}

const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export class ServerConnection {
  private socket: WebSocket | null = null;
  private reconnectDelay = RECONNECT_MIN_MS;
  private heartbeatTimer: number | null = null;
  private readonly identity: StoredIdentity;
  private listener: ConnectionListener = {};
  private state: ConnectionState = "connecting";

  constructor() {
    this.identity = loadOrCreateIdentity();
  }

  setListener(listener: ConnectionListener): void {
    this.listener = listener;
  }

  get interfaceId(): string {
    return this.identity.interfaceId;
  }

  connect(): void {
    this.setState("connecting");
    this.socket = new WebSocket(wsUrl());
    this.socket.addEventListener("open", () => this.handleOpen());
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data as string));
    this.socket.addEventListener("close", () => this.handleClose());
    this.socket.addEventListener("error", () => this.socket?.close());
  }

  requestPage(request: { pageId?: string; slug?: string }): void {
    this.send(
      createEnvelope({
        type: MESSAGE_TYPES.INTERFACE_PAGE_REQUEST,
        source: this.source(),
        payload: request,
      }),
    );
  }

  interact(
    pageId: string,
    widgetId: string,
    trigger: WidgetInteractionTrigger,
    inputOverride?: Record<string, unknown>,
  ): void {
    const payload: InterfaceWidgetInteractPayload = { pageId, widgetId, trigger, inputOverride };
    this.send(createEnvelope({ type: MESSAGE_TYPES.INTERFACE_WIDGET_INTERACT, source: this.source(), payload }));
  }

  updateViewport(): void {
    this.send(
      createEnvelope({
        type: MESSAGE_TYPES.INTERFACE_VIEWPORT_UPDATE,
        source: this.source(),
        payload: { viewport: currentViewport() },
      }),
    );
  }

  private handleOpen(): void {
    this.reconnectDelay = RECONNECT_MIN_MS;
    this.send(
      createEnvelope({
        type: MESSAGE_TYPES.INTERFACE_REGISTER,
        source: this.source(),
        payload: {
          interfaceId: this.identity.interfaceId,
          name: this.identity.name,
          userAgent: navigator.userAgent,
          viewport: currentViewport(),
          supportedFeatures: ["deck", "admin"],
          token: this.identity.token ?? undefined,
        },
      }),
    );
    this.startHeartbeat();
  }

  private handleMessage(raw: string): void {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return;
    }
    const parsed = tryParseEnvelope(json);
    if (!parsed.ok) return;

    const envelope = parsed.envelope;
    switch (envelope.type) {
      case MESSAGE_TYPES.SERVER_INTERFACE_ACCEPTED: {
        const payload = envelope.payload as ServerInterfaceAcceptedPayload;
        if (payload.token && payload.token !== this.identity.token) {
          this.identity.token = payload.token;
          persistIdentity(this.identity);
        }
        this.setState("connected");
        break;
      }
      case MESSAGE_TYPES.SERVER_PAGE_SNAPSHOT: {
        const payload = envelope.payload as ServerPageSnapshotPayload;
        this.listener.onPage?.(payload.page);
        break;
      }
      case MESSAGE_TYPES.SERVER_WIDGET_STATE_UPDATE: {
        const payload = envelope.payload as ServerWidgetStateUpdatePayload;
        this.listener.onWidgetValue?.(payload.widgetId, payload.property, payload.value);
        break;
      }
      case MESSAGE_TYPES.SERVER_NOTIFICATION: {
        this.listener.onNotification?.(envelope.payload as ServerNotificationPayload);
        break;
      }
      default:
        break;
    }
  }

  private handleClose(): void {
    this.setState("disconnected");
    this.stopHeartbeat();
    window.setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send(createEnvelope({ type: MESSAGE_TYPES.INTERFACE_HEARTBEAT, source: this.source(), payload: {} }));
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.listener.onStateChange?.(state);
  }

  getState(): ConnectionState {
    return this.state;
  }

  private send(envelope: ReturnType<typeof createEnvelope>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(envelope));
    }
  }

  private source() {
    return { role: "interface" as const, instanceId: this.identity.interfaceId };
  }
}

function currentViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: window.innerWidth >= window.innerHeight ? ("landscape" as const) : ("portrait" as const),
  };
}
