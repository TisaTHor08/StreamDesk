# ADR-003 — WebSocket as the real-time channel

## Status
Accepted

## Context
Interface needs sub-second feedback (button press → widget state
change) and Connect needs to receive action-execute commands the moment
the Server routes them — both are server-push-heavy, ruling out plain
request/response polling as the primary channel.

## Decision
A single persistent WebSocket connection per Interface (`/ws/interface`)
and per Connect (`/ws/connect`), carrying every message type in
`docs/protocol/messages.md` as a JSON-encoded `ProtocolEnvelope`. HTTP
(`Fastify`) is used only for the Admin REST API, health checks, and
serving the built Interface bundle — never for the interactive loop.

## Consequences
- Reconnection has to be handled explicitly by both clients
  (`apps/interface/src/ws/connection.ts`, `apps/connect/src/ws/client.ts`)
  with exponential backoff, since a dropped socket is the normal case on
  flaky Wi-Fi.
- Heartbeats (`interface.heartbeat` / `connect.heartbeat`, both ~15-20s)
  exist so the Server's connection registry doesn't need TCP-level
  keepalive tuning to notice a dead peer.
- Every message needs a stable envelope (ADR-007) since there's no
  HTTP status code to lean on for framing/errors.
