# ADR-004 — SQLite as V1 storage, raw SQL over an ORM

## Status
Accepted

## Context
The Server needs durable storage for pages, devices, plugins, execution
history, and data source values (section 20's entity list), running
unmodified on Windows, Linux, and a Raspberry Pi, ideally without a
separate database server process to install and operate.

## Decision
`better-sqlite3` (synchronous, in-process, well-maintained, ships
prebuilt ARM64 binaries — see ADR-009) with one hand-written SQL
migration file per schema change (`apps/server/src/db/migrations/`) and a
~30-line migration runner (`apps/server/src/db/migrate.ts`) that applies
whatever hasn't been recorded in a `_migrations` table yet. Pages are
stored as a single JSON document per row (`pages.content`) rather than
normalized into a separate `widgets` table, since a `DeckPage` is always
read and written as one unit.

Drizzle ORM and Prisma were both considered (as the spec suggested) and
rejected for V1 specifically because their migration-generation tooling
needs to actually run (`drizzle-kit generate`, `prisma migrate`) to
produce anything — a codegen step this codebase's author couldn't
execute and verify in the environment it was written in. Raw SQL with
prepared statements, wrapped in a thin per-entity repository class
(`apps/server/src/db/repositories/`), was the more auditable and less
risky choice under that constraint, and remains a reasonable choice for
a project of this size regardless.

## Consequences
- Repositories are small, explicit, and easy to review — every query is
  visible SQL, not generated from a schema DSL.
- No compile-time query type-checking against the schema (an ORM's main
  selling point); repositories manually keep row shapes and TypeScript
  types in sync.
- Revisiting an ORM (most likely Drizzle, given it doesn't require a
  running database to type-check) is tracked as a possible future
  improvement, not a blocking gap.
