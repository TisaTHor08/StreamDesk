import {
  MESSAGE_TYPES,
  createEnvelope,
  tryParseEnvelope,
  type InterfaceWidgetInteractPayload,
  type ServerErrorPayload,
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
  private closedByUser = false;

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
    // Idempotency guard: React 18 StrictMode deliberately runs an effect's
    // setup twice in dev (mount -> cleanup -> mount again) to surface
    // missing cleanup — and ConnectionProvider's effect calls connect() on
    // every run. Without this guard, the second call opened a *second*
    // WebSocket on this same instance, silently orphaning the first (still
    // open, still registered, but no longer referenced by `this.socket` so
    // `send()` stopped using it) — which then closed on its own and
    // triggered handleClose()'s reconnect, which raced with the second
    // socket's own lifecycle. The visible symptom was a rapid, endless
    // "register -> disconnect -> reconnect" loop (see the Server's own log)
    // that never gave the Interface a stable connection to actually render
    // a page against.
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.closedByUser = false;
    this.setState("connecting");
    this.socket = new WebSocket(wsUrl());
    this.socket.addEventListener("open", () => this.handleOpen());
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data as string));
    this.socket.addEventListener("close", () => this.handleClose());
    this.socket.addEventListener("error", () => this.socket?.close());
  }

  /** Closes the current socket without triggering the automatic reconnect
   * — for a genuine teardown (e.g. a future route that unmounts
   * ConnectionProvider), as opposed to handleClose()'s "the connection
   * dropped unexpectedly, retry" path. */
  close(): void {
    this.closedByUser = true;
    this.stopHeartbeat();
    this.socket?.close();
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
    } catch (error) {
      console.error("[StreamDesk] Message WebSocket illisible (JSON invalide)", error, raw);
      return;
    }
    const parsed = tryParseEnvelope(json);
    if (!parsed.ok) {
      // A message that fails validation here (e.g. a Server/Interface
      // protocol version mismatch after only one side was updated) used to
      // vanish silently — the Interface just never got e.g. its page
      // snapshot, with nothing on screen to explain why. Logging it is the
      // difference between "black screen, no idea why" and an actionable
      // console error.
      console.error("[StreamDesk] Message WebSocket rejeté par la validation du protocole", parsed.error, json);
      return;
    }

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
      case MESSAGE_TYPES.SERVER_ERROR: {
        // Previously fell into the silent `default` branch below — a
        // rejected message (e.g. malformed register, unknown widget) would
        // just vanish with nothing on screen to explain a stuck/blank
        // Interface. Surfaced as a notification (visible) in addition to
        // the console log already emitted by handleMessage's parse-failure
        // branch, since a SERVER_ERROR is itself a validly-parsed message.
        const payload = envelope.payload as ServerErrorPayload;
        console.error("[StreamDesk] Erreur reçue du Serveur", payload);
        this.listener.onNotification?.({ level: "error", message: `Erreur serveur (${payload.code}) : ${payload.message}` });
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
    if (this.closedByUser) return;
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
