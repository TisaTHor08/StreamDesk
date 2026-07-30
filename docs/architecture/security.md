# Security model — V1, stated plainly

This project's instructions call for reliable, secure, optimized
software. For V1, "secure" mostly means: **the security model is
honestly documented, not oversold.** Concretely:

## What V1 does provide

- Every WebSocket/HTTP message is validated against a Zod schema before
  its payload is trusted (`packages/protocol/src/validate.ts`) — Règle 7.
- Tokens are never stored in plaintext (`apps/server/src/security/tokens.ts`
  hashes with SHA-256 before persisting) and are stripped from logs
  (`redact()` in both `apps/server/src/logging/logger.ts` and
  `apps/connect/src/logging/logger.ts` — Règle 9).
- An Interface or Connect can be revoked from Admin
  (`POST /api/interfaces/:id/revoke`, `POST /api/connects/:id/revoke`);
  a revoked instance is rejected at the next `*.register`.
- Plugin manifests are validated (unknown permissions are rejected
  outright, at least one component must be declared, `apiVersion` must
  match); a plugin that fails to activate is marked `error` and does not
  take down the Server.
- Plugin storage is namespaced per plugin id — one plugin cannot read or
  write another's data through the SDK.
- `system.command.safe-example` in `core-actions` is a deliberately
  neutered stand-in for "run a command" — it does not shell out to
  anything; see the comment in `plugins/core-actions/connect/index.js`.
  There is no action anywhere in the codebase that executes an
  operator-supplied, unvalidated system command.

## What V1 does *not* provide (do not assume otherwise)

- **No plugin sandbox.** Plugins run in-process, as trusted code, on
  both the Server and Connect. A malicious or buggy plugin can do
  anything the Server/Connect process itself can do. Permissions in
  `plugin.json` are declared, stored, and shown in Admin — they are
  **not enforced**. Only install plugins whose code you've read or trust.
- **No transport encryption by default.** The Server listens on plain
  `http://` / `ws://`. This is acceptable on a trusted local network for
  V1; put a TLS-terminating reverse proxy in front of it (Caddy, nginx,
  Traefik) before exposing it beyond that, and definitely before
  exposing it to the public internet.
- **No operator approval gate on pairing.** The first `interface.register`
  or `connect.register` for a given id is accepted automatically and
  issued a permanent token (see `docs/protocol/messages.md`). The
  pairing-token endpoint (`POST /api/pairing-tokens`,
  `apps/server/src/security/pairing-service.ts`) exists precisely so this
  can be tightened to "only accept a registration that presents a valid,
  operator-issued pairing token" later without a protocol change — it
  just isn't the default in V1.
- **No code signing.** Nothing checks that a plugin's code matches what
  its manifest claims.
- **No multi-user access control.** There's one operator's worth of
  trust; Admin isn't partitioned per user.

## Practical guidance

- Run StreamDesk on a network you trust.
- Only install plugins from sources you trust, and read `server/`,
  `connect/`, and `interface/` component code before installing —
  nothing stops a plugin from doing anything the process can do.
- If you need to expose the Server beyond your LAN, put TLS and a real
  auth layer in front of it first; don't rely on V1's pairing tokens as
  your only line of defense.

See ADR-010 for the reasoning behind choosing this trust model for V1
specifically, and `ROADMAP.md` for what's planned to close these gaps.
