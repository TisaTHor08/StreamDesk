# ADR-002 — TypeScript and a pnpm workspaces monorepo

## Status
Accepted

## Context
Three runtime apps (Server, Connect, Interface) and a growing set of
shared contracts (protocol, shared types, three SDKs) need to stay in
sync as the same source of truth, across Windows/Linux/ARM64, without
publishing packages to a registry just to consume them internally.

## Decision
A single pnpm workspace (`pnpm-workspace.yaml`) with `apps/*`,
`packages/*`, `plugins/*`. TypeScript strict mode everywhere
(`tsconfig.base.json`: `strict: true`, `noUncheckedIndexedAccess: true`,
`noImplicitOverride: true`, `noEmitOnError: true`). No `any` without
justification (enforced via `@typescript-eslint/no-explicit-any: error`).

## Consequences
- `workspace:*` dependencies mean a change to `packages/shared-types` is
  immediately visible (post-build) to every consumer — no version
  bumping/publishing loop during development.
- Plugin runtime code (`plugins/*/server|connect|interface`) is
  deliberately plain JS, not part of the TypeScript build graph — see
  ADR-005 for why that split exists.
- Cost: pnpm + Corepack is one more toolchain requirement on top of
  Node.js itself; documented in every install guide.
