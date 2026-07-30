# StreamDesk

StreamDesk is an open source platform that turns any phone, tablet,
browser, or touchscreen — connected to a Raspberry Pi, a PC, or a small
server — into a dynamic touch control surface: a Stream Deck-like tool,
but not limited to a fixed grid of buttons, and built from day one to be
extended by community plugins.

## Vision

Three roles, clearly separated:

- **Interface** — what the user sees and touches: pages, widgets, states.
  No business logic, no secrets, no permanent configuration. Any screen
  can pick up any Interface after pairing with the Server.
- **Server** — the central authority: configuration, pages, widgets,
  devices, plugins, actions, events, data sources, routing, persistence,
  permissions, logs. Knows nothing about OBS, Hue, Minecraft, or any
  other specific piece of software.
- **Connect** — an integration agent that bridges the Server to real
  software and services (OBS, Home Assistant, a local browser, an OS
  shell, ...). Executes what the Server routes to it; doesn't decide the
  global logic itself.

Interface and Connect never talk to each other directly — everything
routes through the Server. See `ARCHITECTURE.md` for the full picture,
including the ten binding architectural rules and where V1 knowingly
deviates from a literal reading of the original spec.

## Repository layout

```text
apps/server/       Server (Fastify + WebSocket + SQLite)
apps/connect/       Connect agent
apps/interface/     Interface PWA (Deck + Admin)
packages/           Shared contracts and SDKs (protocol, shared-types,
                     plugin-manifest, server-sdk, connect-sdk,
                     interface-sdk, ui-kit, test-utils)
plugins/            core-actions (built-in actions/data sources) and
                     example-plugin (tutorial plugin)
deployments/        Docker, Raspberry Pi, Windows
docs/               Architecture, plugin development, installation,
                     protocol, ADRs
e2e/                Playwright end-to-end test
```

## Quickstart (single machine, Scenario D)

Requires Node.js 20 LTS and pnpm (via Corepack).

```bash
corepack enable
pnpm install
pnpm build      # builds every package once so cross-package imports resolve
pnpm dev        # runs Server (:8080), Connect, and the Interface dev server (:5173)
```

Open `http://localhost:5173` — you'll land on the Deck with a seeded
"Accueil" page (a log-write button, a counter button + its live display,
and a Connect-online indicator), demonstrating the full loop:

```text
touch -> Interface -> Server -> action router -> Server or Connect
      -> result -> data source -> Server -> Interface update
```

Administration is at `http://localhost:5173/admin` (or
`http://localhost:8080/admin` once the Interface is built and served by
the Server itself).

For Raspberry Pi, Windows, or Docker installs, see
`deployments/raspberry/README.md`, `deployments/windows/README.md`, and
`deployments/docker/README.md`.

## Status of this V1

Functional and internally consistent, built to run the full flow above,
not a visual mockup. What's real: the versioned WebSocket protocol with
Zod validation both ways, SQLite persistence with a migration runner, the
action router (server-execution, connect-routing, timeouts, typed error
codes), a minimal plugin system (manifest validation, per-plugin
storage/permissions, three SDKs), two working plugins, a Deck renderer
with pluggable widgets, and a (deliberately simple) page/widget admin
editor.

What's explicitly **not** in V1 — see `ROADMAP.md` for the full list and
rationale: a public plugin marketplace, plugin code signing / a real
sandbox, OBS/Home Assistant/Hue/Fusion 360/Visual Studio/Minecraft
integrations, a ready-to-flash Raspberry Pi image, cloud sync, and
dynamic (network-fetched) loading of Interface plugin code — Interface
plugin modules are statically linked into the build in V1 (see
`ARCHITECTURE.md`).

**Nothing in this codebase has been executed in the environment it was
authored in** (no npm registry access there) — it has been written and
reviewed carefully, but you should run `pnpm install && pnpm build &&
pnpm test` yourself before relying on it, and treat this as a solid,
readable V1 skeleton rather than a battle-tested release.

## Security limits of V1 (read this)

- Plugins run **in-process**, as trusted code. There is no real sandbox.
  Permissions in a plugin manifest are declared, stored, and shown to the
  operator — they are not yet enforced. Only install plugins you trust.
- The default HTTP/WebSocket transport is unencrypted (plain `ws://`).
  Fine on a trusted local network for V1; put it behind TLS (a reverse
  proxy, or Caddy/nginx) before exposing it beyond that.
- First-contact registration auto-issues a permanent token to any
  Interface/Connect that asks — there's no operator approval gate yet.
  The pairing-token infrastructure (`POST /api/pairing-tokens`) exists so
  enforcing it later doesn't require a protocol change.

Full details in `docs/architecture/security.md` and ADR-010.

## Contributing

See `PLUGIN_API.md` and `docs/plugin-development/` for how to build a
plugin, and `ARCHITECTURE.md` for the rules any contribution to the core
must respect (most importantly: the core never references a specific
piece of software — that always belongs in a plugin).

## License

MIT — see `LICENSE`.
