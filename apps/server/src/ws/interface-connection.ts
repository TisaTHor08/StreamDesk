import type { WebSocket } from "ws";
import {
  MESSAGE_TYPES,
  createEnvelope,
  tryParseEnvelope,
  type InterfaceHeartbeatPayload,
  type InterfacePageRequestPayload,
  type InterfaceRegisterPayload,
  type InterfaceViewportUpdatePayload,
  type InterfaceWidgetInteractPayload,
} from "@streamdesk/protocol";
import type { Runtime } from "../core/runtime.js";
import { generateId, generateToken, hashToken } from "../security/tokens.js";
import { makeSender, sendError } from "./envelope-io.js";
import { CURRENT_PAGE_SCHEMA_VERSION, type DeckPage } from "@streamdesk/shared-types";

const SERVER_INSTANCE_ID = "server";

function emptyPage(): DeckPage {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
    id: "empty",
    name: "Aucune page",
    slug: "empty",
    grid: { columns: 4, rowHeight: 96, gap: 8 },
    widgets: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function handleInterfaceConnection(socket: WebSocket, runtime: Runtime): void {
  const logger = runtime.logger.child("interface", "unregistered");
  let interfaceId: string | undefined;
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
      case MESSAGE_TYPES.INTERFACE_REGISTER: {
        const payload = envelope.payload as InterfaceRegisterPayload;
        interfaceId = registerInterface(runtime, socket, payload);
        break;
      }
      case MESSAGE_TYPES.INTERFACE_VIEWPORT_UPDATE: {
        if (!interfaceId) return;
        const payload = envelope.payload as InterfaceViewportUpdatePayload;
        runtime.repos.interfaces.updateViewport(interfaceId, payload.viewport, new Date().toISOString());
        break;
      }
      case MESSAGE_TYPES.INTERFACE_PAGE_REQUEST: {
        if (!interfaceId) return;
        const payload = envelope.payload as InterfacePageRequestPayload;
        sendPageSnapshot(runtime, socket, interfaceId, payload);
        break;
      }
      case MESSAGE_TYPES.INTERFACE_WIDGET_INTERACT: {
        if (!interfaceId) return;
        const payload = envelope.payload as InterfaceWidgetInteractPayload;
        void handleWidgetInteract(runtime, socket, interfaceId, payload);
        break;
      }
      case MESSAGE_TYPES.INTERFACE_HEARTBEAT: {
        if (!interfaceId) return;
        runtime.repos.interfaces.touch(interfaceId, new Date().toISOString());
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
        sendError(socket, "server", SERVER_INSTANCE_ID, "UNKNOWN_MESSAGE_TYPE", `Unexpected message type "${envelope.type}" on interface channel`);
    }
  });

  socket.on("close", () => {
    if (!interfaceId) return;
    runtime.connections.removeInterface(interfaceId);
    runtime.repos.interfaces.setStatus(interfaceId, "offline", new Date().toISOString());
    logger.info("Interface disconnected", { interfaceId });
  });
}

function registerInterface(runtime: Runtime, socket: WebSocket, payload: InterfaceRegisterPayload): string {
  const logger = runtime.logger.child("interface", payload.interfaceId);
  const now = new Date().toISOString();

  const existing = runtime.repos.interfaces.getById(payload.interfaceId);
  let issuedToken: string | null = null;

  if (existing?.revoked) {
    sendError(socket, "server", SERVER_INSTANCE_ID, "UNAUTHORIZED", "This interface has been revoked by the operator");
    socket.close();
    return payload.interfaceId;
  }

  const storedHash = runtime.repos.interfaces.getTokenHash(payload.interfaceId);
  if (storedHash && payload.token && hashToken(payload.token) !== storedHash) {
    sendError(socket, "server", SERVER_INSTANCE_ID, "UNAUTHENTICATED", "Invalid interface token");
    socket.close();
    return payload.interfaceId;
  }

  if (!storedHash) {
    // First contact: mint a permanent token for this interface instance.
    issuedToken = generateToken();
  }

  runtime.repos.interfaces.upsertRegistration(payload, issuedToken ? hashToken(issuedToken) : null, now);
  runtime.connections.addInterface(payload.interfaceId, makeSender(socket));

  const send = makeSender(socket);
  send(
    createEnvelope({
      type: MESSAGE_TYPES.SERVER_INTERFACE_ACCEPTED,
      source: { role: "server", instanceId: SERVER_INSTANCE_ID },
      payload: {
        interfaceId: payload.interfaceId,
        token: issuedToken ?? payload.token ?? "",
        serverTime: now,
      },
    }),
  );

  logger.info("Interface registered", { name: payload.name });
  sendPageSnapshot(runtime, socket, payload.interfaceId, {});
  return payload.interfaceId;
}

function sendPageSnapshot(
  runtime: Runtime,
  socket: WebSocket,
  interfaceId: string,
  request: { pageId?: string; slug?: string },
): void {
  const send = makeSender(socket);
  let page: DeckPage | null = null;

  if (request.pageId) page = runtime.repos.pages.getById(request.pageId);
  else if (request.slug) page = runtime.repos.pages.getBySlug(request.slug);
  else page = runtime.repos.pages.list()[0] ?? null;

  const resolvedPage = page ?? emptyPage();
  runtime.connections.setInterfaceCurrentPage(interfaceId, resolvedPage.id);

  send(
    createEnvelope({
      type: MESSAGE_TYPES.SERVER_PAGE_SNAPSHOT,
      source: { role: "server", instanceId: SERVER_INSTANCE_ID },
      payload: { page: resolvedPage },
    }),
  );
}

async function handleWidgetInteract(
  runtime: Runtime,
  socket: WebSocket,
  interfaceId: string,
  payload: InterfaceWidgetInteractPayload,
): Promise<void> {
  const logger = runtime.logger.child("interface", interfaceId);
  const page = runtime.repos.pages.getById(payload.pageId);
  const widget = page?.widgets.find((w) => w.id === payload.widgetId);
  const interaction = widget?.interactions?.find((i) => i.trigger === payload.trigger);

  if (!page || !widget || !interaction) {
    sendError(socket, "server", SERVER_INSTANCE_ID, "VALIDATION_FAILED", "Unknown page, widget, or interaction");
    return;
  }

  const result = await runtime.router.execute({
    executionId: generateId("exec"),
    actionId: interaction.actionId,
    input: interaction.input,
    target: interaction.target,
    requestedBy: { type: "widget", id: widget.id },
  });

  if (result.status !== "success") {
    const send = makeSender(socket);
    send(
      createEnvelope({
        type: MESSAGE_TYPES.SERVER_NOTIFICATION,
        source: { role: "server", instanceId: SERVER_INSTANCE_ID },
        payload: {
          level: "error",
          message: result.error?.message ?? `Action failed with status "${result.status}"`,
        },
      }),
    );
  }

  logger.debug("Widget interaction handled", {
    pageId: payload.pageId,
    widgetId: payload.widgetId,
    actionId: interaction.actionId,
    status: result.status,
  });
}
