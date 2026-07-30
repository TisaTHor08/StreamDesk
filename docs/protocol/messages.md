# Protocol messages

All messages are `ProtocolEnvelope<TPayload>` (see
`packages/protocol/src/envelope.ts`):

```ts
type ProtocolEnvelope<TPayload> = {
  protocolVersion: string;   // "1"
  messageId: string;         // UUID, set by createEnvelope()
  type: string;               // one of the message types below
  timestamp: string;          // ISO 8601, set by createEnvelope()
  source: { role: "interface" | "server" | "connect"; instanceId: string };
  correlationId?: string;
  payload: TPayload;
};
```

Every envelope is validated on receipt
(`packages/protocol/src/validate.ts`): unknown `protocolVersion` →
`UNSUPPORTED_PROTOCOL_VERSION`, unknown `type` → `UNKNOWN_MESSAGE_TYPE`,
schema mismatch on the envelope or payload → `VALIDATION_FAILED`. All
three map to a `server.error` reply on the socket that sent the bad
message (or, for messages arriving before that socket registered, the
socket is closed).

## Interface → Server

### `interface.register`

First message an Interface sends after connecting to `/ws/interface`.

```ts
payload: {
  interfaceId: string; name: string; userAgent: string;
  viewport: { width: number; height: number; pixelRatio: number; orientation: "portrait" | "landscape" };
  supportedFeatures: string[];
  token?: string; // omit on first-ever contact
}
```

**Response:** `server.interface.accepted`, immediately followed by
`server.page.snapshot` (the first page currently known to the Server).
**Errors:** `UNAUTHORIZED` (revoked) or `UNAUTHENTICATED` (token
mismatch) as a `server.error`, then the socket is closed.

### `interface.viewport.update`

`payload: { viewport: { width, height, pixelRatio, orientation } }` — no
response; updates the stored record and is used for future
responsive-layout decisions.

### `interface.page.request`

`payload: { pageId?: string; slug?: string }` (both empty → "first page
known"). **Response:** `server.page.snapshot`.

### `interface.widget.interact`

`payload: { pageId: string; widgetId: string; trigger: "press" | "release" | "longPress" }`.
Looked up against the widget's `interactions[]`; if found, routed through
the action router. **Response:** none on success (state changes arrive
via `server.widget.state.update` if the action affects a bound data
source); `server.notification` with `level: "error"` on failure.
**Errors:** `VALIDATION_FAILED` if the page/widget/interaction doesn't
exist.

### `interface.heartbeat`

`payload: {}`, sent every ~20s. **Response:** `server.heartbeat`.

## Server → Interface

### `server.interface.accepted`

`payload: { interfaceId: string; token: string; serverTime: string }`.
`token` is empty-string on a token-mismatch path that was already
rejected upstream; otherwise it's either the newly-issued permanent token
(first contact) or an echo of the token the Interface already had.

### `server.page.snapshot`

`payload: { page: DeckPage }` — the full page (see `docs/protocol/`
model types below), sent on register, on `interface.page.request`, and
whenever an admin edit is saved for the page a given Interface is
currently viewing.

### `server.widget.state.update`

`payload: { pageId, widgetId, property, dataSourceId?, value, quality, updatedAt }`
— sent whenever a data source a currently-visible widget is bound to
changes. `quality` is `"good" | "stale" | "unavailable"`.

### `server.notification`

`payload: { level: "info" | "warn" | "error"; message: string }` — used
today only for widget-interaction failures; a general-purpose channel
for future use.

### `server.error`

`payload: { code, message, details?, inResponseTo? }` — see the
`ProtocolErrorCode` union in `packages/protocol/src/protocol-error.ts`.

### `server.heartbeat`

`payload: { serverTime: string }`.

## Connect → Server

### `connect.register`

First message after connecting to `/ws/connect`.

```ts
payload: {
  connectId: string; name: string;
  platform: "windows" | "linux" | "macos"; architecture: "x64" | "arm64";
  version: string; capabilities: CapabilityDescriptor[]; token?: string;
}
```

**Response:** `server.connect.accepted`. **Errors:** same
`UNAUTHORIZED`/`UNAUTHENTICATED` pattern as `interface.register`.

### `connect.capabilities.update`

`payload: { capabilities: CapabilityDescriptor[] }` — replaces the
Connect's previously-announced capability set (e.g. after a plugin
reloads).

### `connect.action.result`

`payload: ActionExecutionResult` — reply to a `server.action.execute` the
Server previously sent this Connect, correlated by `executionId`. If the
`executionId` is unknown (already timed out, or never sent), the Server
logs a warning and drops it.

### `connect.event.publish`

`payload: { eventType: string; payload: unknown }`. The Server resolves
`sourcePluginId` from the event's registered `EventDefinition` (which
must already have been registered by the corresponding Server-side
plugin component) and `sourceConnectId` from the sending socket, then
runs it through the same validated event bus a Server-side `events.publish()`
would use.

### `connect.datasource.update`

`payload: { dataSourceId: string; value: unknown }` — pushed straight
into the data source store (see `docs/protocol/messages.md`'s data model
section).

### `connect.health.update`

`payload: { uptimeSeconds: number; status: "online"; loadedPlugins: string[] }`.

### `connect.heartbeat`

`payload: {}`, sent every ~15s alongside a `connect.health.update`.
**Response:** `server.heartbeat`.

## Server → Connect

### `server.connect.accepted`

`payload: { connectId: string; token: string; serverTime: string }`.

### `server.action.execute`

`payload: ActionExecutionRequest` (`executionId`, `actionId`, `input`,
`target?`, `requestedBy`) — sent when the router picks this Connect to
run a `connect`-executed action. Expects a matching
`connect.action.result` back; if none arrives within
`ACTION_TIMEOUT_MS` (default 10s), the router resolves the pending
execution as `status: "timeout"` on its own.

### `server.datasource.subscribe`

`payload: { dataSourceIds: string[] }` — reserved for a future
"pull"/subscription model; not sent by the current implementation
(Connects push proactively instead). Included in the protocol now so
adding it later isn't a breaking change.

### `server.plugin.configuration.update`

`payload: { pluginId: string; settings: Record<string, unknown> }` —
reserved for pushing admin-edited plugin settings to a Connect; the
`plugin_settings` table and REST shape exist, the push-on-change wiring
is not yet connected in V1 (see `ROADMAP.md`).

### `server.error` / `server.heartbeat`

Same shape as the Interface-facing versions above.

## Error codes reference

Protocol-level (`ProtocolErrorPayload.code`): `VALIDATION_FAILED`,
`UNKNOWN_MESSAGE_TYPE`, `UNSUPPORTED_PROTOCOL_VERSION`,
`UNAUTHENTICATED`, `UNAUTHORIZED`, `INTERNAL_ERROR`.

Action-execution-level (`ActionExecutionResult.error.code`):
`ACTION_NOT_FOUND`, `INVALID_ACTION_INPUT`, `NO_COMPATIBLE_CONNECT`,
`CONNECT_OFFLINE`, `ACTION_TIMEOUT`, `ACTION_EXECUTION_FAILED`,
`PERMISSION_DENIED` (reserved, not yet raised anywhere — see
`docs/architecture/security.md` on permission enforcement),
`PLUGIN_DISABLED`.
