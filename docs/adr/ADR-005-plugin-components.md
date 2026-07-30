# ADR-005 — Plugins split into independent Server/Connect/Interface components

## Status
Accepted

## Context
A plugin's logic naturally spans up to three different runtimes with
different capabilities and trust boundaries (Server has the database and
routing authority; Connect has OS/local-software access; Interface has
the rendering surface) — see ADR-001.

## Decision
`plugin.json`'s `components` object has three independent, all-optional
entries (`server`, `connect`, `interface`), each with its own entrypoint
and — for `connect` — its own `platforms`/`architectures` gate. A plugin
can ship just one component (e.g. `core-actions` has no `interface`
component) or all three (`example-plugin`). Component code is loaded as
plain ESM JavaScript (not compiled TypeScript) so that installing a
plugin never requires running a build step — `apps/server/src/plugins/loader.ts`
and `apps/connect/src/plugins/loader.ts` both `import()` the entrypoint
file directly.

## Consequences
- A contributor can write a Connect-only plugin (e.g. "control this one
  piece of hardware") without touching the Server or Interface at all.
- The Server's plugin loader never needs to know anything about
  React/Vite, and the Connect's loader never needs a database.
- Plain-JS entrypoints mean type-checking a plugin during development is
  opt-in (`// @ts-check` + JSDoc, as used in `plugins/core-actions` and
  `plugins/example-plugin`) rather than mandatory — lower friction for
  small contributions, at the cost of no build-time guarantee that a
  published plugin type-checks.
