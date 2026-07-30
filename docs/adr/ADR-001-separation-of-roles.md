# ADR-001 — Separation of Interface / Server / Connect

## Status
Accepted

## Context
The platform needs to run across very different machines (a Raspberry
Pi, a Windows PC, a tablet browser) in combinations that change per
installation (see the four scenarios in `README.md`), while staying
extensible by community plugins that touch arbitrary third-party
software.

## Decision
Split the system into three roles with a strict communication rule:
Interface and Connect never talk directly, everything routes through the
Server (Règle 5). The Server owns state and routing but knows nothing
about specific software (Règle 1); Connect knows how to talk to specific
software but not the global logic (Règle 6); Interface only renders and
collects input (Règle 8/9).

## Consequences
- Any Interface can be swapped for another without losing configuration.
- Any number of Connects can run on any machine that has the software to
  control, independent of where the Server runs.
- The core Server package never grows a dependency on a specific
  integration — that pressure is absorbed entirely by the plugin system.
- Cost: every action/event/data source has to be modeled generically
  enough to survive going through this indirection, which is more upfront
  design work than a monolithic app would need.
