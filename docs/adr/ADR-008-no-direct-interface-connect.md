# ADR-008 — No direct Interface ↔ Connect communication

## Status
Accepted

## Context
It would be technically simpler, in some cases, for an Interface to talk
straight to a Connect (e.g. for very low-latency control). But it breaks
the single-authority model: the Server would no longer be the one place
that knows the full system state, validates permissions, and can
enforce routing decisions.

## Decision
Interface and Connect each hold exactly one WebSocket connection, both
to the Server (`/ws/interface`, `/ws/connect`), and never to each other.
Every effect of a touch on an Interface reaches a Connect (if it reaches
one at all) by going through the Server's action router
(`apps/server/src/core/action-router.ts`); every value a Connect produces
reaches an Interface by going through the Server's data source store
(`apps/server/src/core/datasource-store.ts`).

## Consequences
- The Server can always answer "what is currently connected, and what is
  it allowed to do" — no side channel bypasses it.
- Adds one network hop of latency to every interaction versus a direct
  connection; acceptable for a physical button press (perceptually
  instant well within typical LAN latency), revisit only if a specific
  use case proves otherwise.
- Multi-Interface and multi-Connect setups (several tablets, several
  agents) fall out of this "everything through one hub" model for free —
  no N×M direct-connection matrix to manage.
