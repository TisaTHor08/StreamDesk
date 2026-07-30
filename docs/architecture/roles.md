# Roles and responsibilities

This expands on `ARCHITECTURE.md`'s summary with the exact
responsibilities each role does and does not have, and points at the
source files that implement them.

## Interface (`apps/interface`)

**Does:** render pages/widgets/states, collect touch/press/long-press
input, track viewport size, show connection status, persist only a
locally-generated `interfaceId` + pairing token (`src/ws/identity.ts`,
via `localStorage`).

**Does not:** contain business logic, hold secrets, or store the
authoritative page configuration — a page is always fetched fresh from
the Server (`server.page.snapshot`). This is what makes an Interface
"disposable": wipe the browser storage, reconnect, and it re-registers
and gets a fresh page.

Two modes, one codebase: **Deck** (`src/deck/`) is the touch surface;
**Admin** (`src/admin/`) is the page/plugin/device editor, reachable at
`/admin`. Both share the same WebSocket connection
(`src/state/ConnectionProvider.tsx`) and widget registry
(`src/widgets/registry.ts`).

## Server (`apps/server`)

**Does:** owns the SQLite database (`src/db/`), the action router
(`src/core/action-router.ts`), the event bus (`src/core/event-bus.ts`),
the data source store (`src/core/datasource-store.ts`), the plugin
loader (`src/plugins/loader.ts`), pairing/tokens (`src/security/`), and
every WebSocket/HTTP endpoint. `src/core/runtime.ts` is the composition
root — one `Runtime` instance ties all of the above together and is
threaded through every handler and every plugin's context.

**Does not:** reference OBS, Hue, Minecraft, or any other specific piece
of software anywhere in `apps/server/src` outside of what a plugin
brings in dynamically. If you find yourself wanting to add
`if (pluginId === "obs") ...` to the core, that logic belongs in a
plugin instead.

## Connect (`apps/connect`)

**Does:** registers with the Server, announces capabilities
(`src/core/capability-registry.ts`), executes actions routed to it
(`src/core/action-handlers.ts`), publishes events/data source values,
reports health, reconnects with backoff (`src/ws/client.ts`). Keeps its
own small identity file (`src/identity.ts`) and per-plugin JSON storage
(`src/storage/file-plugin-storage.ts`) — deliberately no database, to
stay a lightweight, easy-to-run agent on whatever machine has the
software to control.

**Does not:** decide *which* Connect should run a given action (that's
the Server's router, via `CapabilityIndex`), and never receives a
message from an Interface directly.
