# Architecture

## The three roles

### Interface

Displays pages, widgets, states, icons, and feedback; collects presses,
long presses, page changes, viewport size, and connection state. Holds no
business logic, no secrets, and no permanent configuration (Règle 8) — a
new screen re-registers with the Server and receives its page snapshot,
nothing more is needed locally beyond a small identity token.

### Server

The single authority: configuration, pages, widgets, devices, Connects,
plugins, actions, events, data sources, command routing, persistence,
permissions, logs, WebSocket/HTTP. Contains **zero** references to any
specific piece of software (Règle 1) — everything OBS/Hue/Minecraft/etc.
belongs to a plugin.

### Connect

An integration agent bridging the Server to real software. Announces
capabilities, receives and executes actions, publishes events and data
source values, reports health. Never decides global logic — it executes
what the Server's router sends it (Règle 6).

## Network flow

```text
Interface  <--WebSocket-->  Server  <--WebSocket-->  Connect
                              |
                            SQLite
```

Interface and Connect **never** talk to each other directly (Règle 5).
Every message is a versioned, Zod-validated envelope
(`packages/protocol`); see `docs/protocol/messages.md` for the full
message catalogue.

## The action model

An `ActionDefinition` is independent of whatever triggers it (Règle 2): a
widget interaction, a future automation, another plugin, or the admin
API can all call `actions.execute()`. `apps/server/src/core/action-router.ts`
implements the 14-step routing algorithm: validate → resolve action →
validate input (via Ajv against the plugin's JSON Schema) → check
plugin/permission state → execute locally (`executionLocation: "server"`)
or dispatch to a Connect (`"connect"`) → await result with a timeout →
persist → return a typed result (`ActionExecutionResult`, with error
codes `ACTION_NOT_FOUND`, `INVALID_ACTION_INPUT`, `NO_COMPATIBLE_CONNECT`,
`CONNECT_OFFLINE`, `ACTION_TIMEOUT`, `ACTION_EXECUTION_FAILED`,
`PERMISSION_DENIED`, `PLUGIN_DISABLED`).

## The event model

A `PublishedEvent` is independent of its origin. Connect publishes events
via `connect.event.publish`; Server-side plugins publish via the Server
SDK's `events.publish()`. Every event is validated against its
registered `payloadSchema`, persisted to a bounded log (`event_log`,
capped at 1000 rows), and fanned out to in-process subscribers
(`apps/server/src/core/event-bus.ts`). There is no visual automation
editor yet — the API is there so one can be built without a protocol
change.

## The data source model

A `DataSourceDefinition` is independent of the widget that displays it
(Règle 3). `apps/server/src/core/datasource-store.ts` tracks the latest
value of every data source, persists it, and — whenever it changes —
scans every page for widgets with a matching `binding`, and pushes
`server.widget.state.update` to every Interface currently viewing one of
those pages.

## The plugin system

A plugin is a folder with a `plugin.json` manifest (validated by
`packages/plugin-manifest`) and up to three optional components —
`server`, `connect`, `interface` — each with its own entrypoint (Règle 4:
plugins never import each other's internals directly; they communicate
only via actions/events/data sources). V1 loads plugins from a local,
operator-controlled `plugins/` directory; there is no marketplace yet.

Three SDKs (`packages/server-sdk`, `connect-sdk`, `interface-sdk`) give
each component a narrow, typed surface: register actions/events/data
sources/widgets, get scoped storage, get a logger. See `PLUGIN_API.md`.

## Deviations from the initial spec

Two places where the implementation adds something the original 40-point
spec didn't literally spell out, because the feature couldn't work
without it — documented here rather than silently patched in:

1. **`ServerPluginContext.dataSources.publish(id, value)`** — the
   spec's SDK draft only listed `register` / `getLatest` / `subscribe`
   for the Server side, but that leaves no way for a Server-side plugin
   to actually produce a value for a `computed` data source (e.g.
   `example-plugin`'s counter). Added a `publish` method, mirroring the
   Connect SDK's `dataSources.publish`.
2. **`connect.online` is a core-actions-declared but Server-updated data
   source.** Its *definition* is registered by `core-actions` (so it
   shows up in the plugin/capability listing like everything else), but
   its *value* is pushed directly by `apps/server/src/ws/connect-connection.ts`
   whenever a Connect connects or disconnects — the plugin SDK has no
   visibility into live WebSocket connection state, and giving it that
   visibility would leak Server internals into the plugin surface.
3. **Interface plugin loading is static in V1, not dynamic.** The spec
   anticipates plugins contributing declarative Interface widgets
   (section 15/16) but also explicitly puts "arbitrary JavaScript
   widgets" out of scope for V1 (section 34). True dynamic loading of
   plugin code fetched from the Server at runtime sits between those two
   statements and needs real sandboxing to be safe — so V1 takes the
   honest middle path: `example-plugin`'s Interface component
   (`plugins/example-plugin/interface/index.tsx`) is a real module
   implementing the real `InterfacePluginContext` contract, but it is
   imported statically at build time by
   `apps/interface/src/widgets/plugins.ts`, not fetched over the
   network. A community plugin registry with real dynamic loading is a
   post-V1 milestone (see ROADMAP.md).

## Technical decisions (short version — see docs/adr for the long version)

- **TypeScript strict, pnpm workspaces monorepo** (ADR-002).
- **WebSocket** for all real-time traffic in both directions (ADR-003).
- **SQLite via `better-sqlite3`**, raw SQL + a small hand-written
  migration runner rather than an ORM's codegen step, to keep the
  persistence layer auditable and dependency-light (ADR-004).
- **Widgets are declarative in V1**: a plugin registers a React component
  plus a JSON Schema for its properties; there's no arbitrary/sandboxed
  widget code execution yet (ADR-006).
- **JSON Schema (via Ajv)** for every plugin-declared contract — action
  inputs, event payloads, data source values (ADR-007).
- **No direct Interface↔Connect channel, ever** (ADR-008).
- **ARM64 is a first-class target.** The only native dependency is
  `better-sqlite3`, which ships prebuilt ARM64 binaries; documented
  fallback in `deployments/raspberry/README.md` (ADR-009).

## Security model, honestly stated

See `docs/architecture/security.md`. Short version: V1 plugins are
trusted, in-process code; there is no sandbox and no signature
verification yet. Don't install plugins you don't trust, and don't
expose the Server directly to the internet without putting TLS and real
authentication in front of it.
