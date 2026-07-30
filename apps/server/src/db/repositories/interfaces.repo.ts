import type Database from "better-sqlite3";
import type { ConnectionStatus, InterfaceRecord, InterfaceRegistration } from "@streamdesk/shared-types";

type InterfaceRow = {
  id: string;
  name: string;
  user_agent: string;
  viewport: string;
  supported_features: string;
  token_hash: string | null;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  revoked: number;
};

function rowToRecord(row: InterfaceRow): InterfaceRecord {
  return {
    interfaceId: row.id,
    name: row.name,
    userAgent: row.user_agent,
    viewport: JSON.parse(row.viewport),
    supportedFeatures: JSON.parse(row.supported_features),
    status: row.status as ConnectionStatus,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    revoked: Boolean(row.revoked),
  };
}

export class InterfacesRepository {
  constructor(private readonly db: Database.Database) {}

  list(): InterfaceRecord[] {
    return (this.db.prepare("SELECT * FROM interfaces ORDER BY last_seen_at DESC").all() as InterfaceRow[]).map(
      rowToRecord,
    );
  }

  getById(id: string): InterfaceRecord | null {
    const row = this.db.prepare("SELECT * FROM interfaces WHERE id = ?").get(id) as
      | InterfaceRow
      | undefined;
    return row ? rowToRecord(row) : null;
  }

  upsertRegistration(registration: InterfaceRegistration, tokenHash: string | null, now: string): void {
    this.db
      .prepare(
        `INSERT INTO interfaces (id, name, user_agent, viewport, supported_features, token_hash, status, first_seen_at, last_seen_at, revoked)
         VALUES (@id, @name, @user_agent, @viewport, @supported_features, @token_hash, 'online', @now, @now, 0)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           user_agent = excluded.user_agent,
           viewport = excluded.viewport,
           supported_features = excluded.supported_features,
           token_hash = COALESCE(excluded.token_hash, interfaces.token_hash),
           status = 'online',
           last_seen_at = excluded.last_seen_at`,
      )
      .run({
        id: registration.interfaceId,
        name: registration.name,
        user_agent: registration.userAgent,
        viewport: JSON.stringify(registration.viewport),
        supported_features: JSON.stringify(registration.supportedFeatures),
        token_hash: tokenHash,
        now,
      });
  }

  updateViewport(id: string, viewport: InterfaceRegistration["viewport"], now: string): void {
    this.db
      .prepare("UPDATE interfaces SET viewport = ?, last_seen_at = ? WHERE id = ?")
      .run(JSON.stringify(viewport), now, id);
  }

  touch(id: string, now: string): void {
    this.db.prepare("UPDATE interfaces SET last_seen_at = ?, status = 'online' WHERE id = ?").run(now, id);
  }

  setStatus(id: string, status: ConnectionStatus, now: string): void {
    this.db.prepare("UPDATE interfaces SET status = ?, last_seen_at = ? WHERE id = ?").run(status, now, id);
  }

  getTokenHash(id: string): string | null {
    const row = this.db.prepare("SELECT token_hash FROM interfaces WHERE id = ?").get(id) as
      | { token_hash: string | null }
      | undefined;
    return row?.token_hash ?? null;
  }

  revoke(id: string): void {
    this.db.prepare("UPDATE interfaces SET revoked = 1, status = 'offline' WHERE id = ?").run(id);
  }
}
