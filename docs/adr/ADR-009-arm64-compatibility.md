# ADR-009 — ARM64 (Raspberry Pi) as a first-class target

## Status
Accepted

## Context
Scenario B and C both put the Server (and, for C, the Interface) on a
Raspberry Pi running Raspberry Pi OS 64-bit. Native Node addons are a
common source of "works on my x64 laptop, breaks on the Pi" failures,
either because no prebuilt binary exists for `linux-arm64` or because
compiling from source needs toolchain packages that aren't installed by
default.

## Decision
Minimize native dependencies across the whole workspace; the only one
that remains is `better-sqlite3` (Server-only — Connect and Interface
have none). It was kept, rather than replaced with a pure-JS SQL engine,
because: it ships prebuilt binaries for `linux-arm64` via
`prebuild-install`, it's synchronous (simplifying the repository layer
considerably — no `await` on every query), and it's one of the most
widely deployed native Node modules in production, meaning ARM64
prebuild coverage is actively maintained upstream. The fallback path
(compiling from source) is documented, not silently assumed to always
work: `deployments/raspberry/README.md` calls out installing
`python3 make g++` if `pnpm install` ever needs to compile it.

`ws` (WebSocket) is used with its optional native accelerators
(`bufferutil`, `utf-8-validate`) left truly optional — `ws` functions
correctly without them, just slightly slower, so a missing prebuild on
an unusual architecture degrades performance rather than breaking
installation.

## Consequences
- `apps/server` is the only package with a native dependency; every
  other package/app in the workspace is pure JS/TS and needs no
  attention for ARM64 specifically.
- The Docker image's build stage installs `python3 make g++` (see
  `deployments/docker/Dockerfile`) specifically so a source-compile
  fallback, if it ever triggers, still succeeds inside the container.
- If `better-sqlite3` ever became a real problem on some target, the
  repository-pattern persistence layer (ADR-004) is the one place that
  would need to change — no SQL is written outside
  `apps/server/src/db/repositories/`.
