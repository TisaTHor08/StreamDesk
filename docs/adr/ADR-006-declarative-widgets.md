# ADR-006 — Widgets are declarative in V1

## Status
Accepted

## Context
Section 34 of the original spec puts "arbitrary/sandboxed JavaScript
widgets" explicitly out of scope for V1, while section 15/16 still wants
plugins to be able to contribute custom widgets. Those two constraints
together rule out fetching and `eval`-ing untrusted plugin UI code at
runtime — the one approach that would make widgets fully dynamic without
any build-time coupling.

## Decision
A plugin's Interface component registers a `WidgetDefinition`: a real
React component (`WidgetRenderProps` in) plus a JSON Schema describing
its configurable properties. In V1, that component is imported
**statically** by the Interface app's build
(`apps/interface/src/widgets/plugins.ts`) — see ARCHITECTURE.md's
deviation note — rather than fetched from the Server at runtime.

## Consequences
- Widget code runs with the full trust and privileges of the Interface
  bundle; there is no isolation between a plugin's widget and the rest of
  the app (consistent with the no-sandbox stance in ADR-010).
- Adding a new plugin's widget today means adding one import + one
  `activate()` call to `apps/interface/src/widgets/plugins.ts` — a real
  but small piece of manual wiring, clearly not "drop a folder and go".
- The `WidgetDefinition`/`InterfacePluginContext` contract itself doesn't
  need to change when dynamic loading eventually replaces the static
  import — only the mechanism that calls `activate()` does.
