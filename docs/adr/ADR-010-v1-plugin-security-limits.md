# ADR-010 — V1 plugin security limits (no sandbox, declared-not-enforced permissions)

## Status
Accepted

## Context
The spec asks for a permissions model (`network.local`, `filesystem.write`,
`process.launch`, etc.) but also explicitly says not to claim a full
sandbox if V1 doesn't actually provide one (section 17: "Ne pas prétendre
fournir une sandbox complète si ce n'est pas réellement le cas"). A real
sandbox — process isolation, syscall filtering, capability-scoped file
access — is a substantial engineering effort on its own (worker threads
or child processes per plugin, an IPC layer replacing direct SDK calls,
a permission-check gate on every SDK method) that would have consumed
most of the V1 timebox on its own, for a platform that doesn't have a
plugin ecosystem to protect yet.

## Decision
V1 plugins run in-process, as trusted code, on both Server and Connect.
`plugin.json`'s `permissions` array is validated (unknown permissions are
rejected — Règle "refuser les permissions inconnues") and displayed in
Admin, but **not enforced**: a plugin that declares no permissions can
still do anything the process can do. This is stated plainly in
`README.md`, `ARCHITECTURE.md`, and `docs/architecture/security.md`
rather than left implicit.

Two things are enforced regardless, because they don't require a
sandbox to guarantee: (1) plugin storage namespacing (Règle 4's "espace
de nommage obligatoire" — one plugin's `context.storage` cannot reach
another's rows), and (2) secrets are never sent to the Interface (Règle
9 — tokens are hashed at rest and redacted from logs).

## Consequences
- Operators must trust every plugin they install, in full, today. This
  is called out as the first bullet of `docs/architecture/security.md`.
- The permission list and manifest validation exist specifically so that
  turning on real enforcement later (ROADMAP.md item 2) is "add a
  gate that checks this array before allowing an SDK call", not "design
  a permissions model from scratch".
- No plugin in this repository (`core-actions`, `example-plugin`) relies
  on being unsandboxed for anything beyond what its declared permissions
  already describe — `system.command.safe-example` in particular was
  written specifically to demonstrate the "safe, limited action" pattern
  the spec asks for (section 18), not to execute arbitrary commands.
