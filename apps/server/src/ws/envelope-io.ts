import type { WebSocket } from "ws";
import {
  createEnvelope,
  MESSAGE_TYPES,
  type ProtocolEnvelope,
  type ProtocolErrorCode,
  type ProtocolRole,
} from "@streamdesk/protocol";

export function makeSender(socket: WebSocket) {
  return function send(envelope: ProtocolEnvelope): void {
    if (socket.readyState !== socket.OPEN) return;
    socket.send(JSON.stringify(envelope));
  };
}

export function sendError(
  socket: WebSocket,
  role: ProtocolRole,
  instanceId: string,
  code: ProtocolErrorCode,
  message: string,
  inResponseTo?: string,
): void {
  const envelope = createEnvelope({
    type: MESSAGE_TYPES.SERVER_ERROR,
    source: { role, instanceId },
    payload: { code, message, inResponseTo },
  });
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(envelope));
}
