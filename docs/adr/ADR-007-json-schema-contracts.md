# ADR-007 — JSON Schema for every plugin-declared contract

## Status
Accepted

## Context
Action inputs, event payloads, and data source values are all
plugin-defined shapes that the Server must validate without knowing
anything about the plugin ahead of time (Règle 1) — a generic,
data-driven validation mechanism is required, not per-plugin TypeScript
code the Server would have to import.

## Decision
`ActionDefinition.inputSchema`/`outputSchema`, `EventDefinition.payloadSchema`,
and `DataSourceDefinition.valueSchema` are all JSON Schema
(`packages/shared-types/src/json-schema.ts` — a deliberately small,
structural subset of Draft 2020-12, not a full spec-compliance type).
The Server validates against them with Ajv
(`apps/server/src/validation/json-schema-validator.ts`, with a
`WeakMap`-cached compiled-validator per schema object) before an action
handler ever runs, before an event is published, and — for actions —
before it's even routed to a Connect.

Zod, already used for the protocol *envelope* layer (ADR-003/the
protocol package), was deliberately not reused here: envelope shapes are
fixed and known at compile time (Zod's strength), while
action/event/data-source schemas are arbitrary, plugin-supplied JSON at
runtime (JSON Schema's strength, and the format the spec's manifest
examples were already written in).

## Consequences
- A plugin author writes one JSON Schema object per action/event/data
  source and gets input validation for free — no glue code.
- Two validation libraries (Zod for the protocol layer, Ajv for
  plugin-declared schemas) live in the same codebase; a contributor needs
  to know which layer they're touching. Documented here rather than
  merged into one, since the two layers really are solving different
  problems (fixed compile-time shape vs. dynamic runtime shape).
