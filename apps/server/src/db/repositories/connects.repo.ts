import type Database from "better-sqlite3";
import type {
  Architecture,
  CapabilityDescriptor,
  ConnectionStatus,
  ConnectRecord,
  ConnectRegistration,
  Platform,
} from "@streamdesk/shared-types";

type ConnectRow = {
  id: string;
  name: string;
  platform: string;
  architecture: string;
  version: string;
  capabilities: string;
  token_hash: string | null;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  revoked: number;
  uptime_seconds: number | null;
};

function rowToRecord(row: ConnectRow): ConnectRecord {
  return {
    connectId: row.id,
    name: row.name,
    platform: row.platform as Platform,
    architecture: row.architecture as Architecture,
    version: row.version,
    capabilities: JSON.parse(row.capabilities) as CapabilityDescriptor[],
    status: row.status as ConnectionStatus,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    revoked: Boolean(row.revoked),
    uptimeSeconds: row.uptime_seconds ?? undefined,
  };
}

export class ConnectsRepository {
  constructor(private readonly db: Database.Database) {}

  list(): ConnectRecord[] {
    return (this.db.prepare("SELECT * FROM connects ORDER BY last_seen_at DESC").all() as ConnectRow[]).map(
      rowToRecord,
    );
  }

  getById(id: string): ConnectRecord | null {
    const row = this.db.prepare("SELECT * FROM connects WHERE id = ?").get(id) as ConnectRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  upsertRegistration(registration: ConnectRegistration, tokenHash: string | null, now: string): void {
    this.db
      .prepare(
        `INSERT INTO connects (id, name, platform, architecture, version, capabilities, token_hash, status, first_seen_at, last_seen_at, revoked)
         VALUES (@id, @name, @platform, @architecture, @version, @capabilities, @token_hash, 'online', @now, @now, 0)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           platform = excluded.platform,
           architecture = excluded.architecture,
           version = excluded.version,
           capabilities = excluded.capabilities,
           token_hash = COALESCE(excluded.token_hash, connects.token_hash),
           status = 'online',
           last_seen_at = excluded.last_seen_at`,
      )
      .run({
        id: registration.connectId,
        name: registration.name,
        platform: registration.platform,
        architecture: registration.architecture,
        version: registration.version,
        capabilities: JSON.stringify(registration.capabilities),
        token_hash: tokenHash,
        now,
      });
  }

  updateCapabilities(id: string, capabilities: CapabilityDescriptor[], now: string): void {
    this.db
      .prepare("UPDATE connects SET capabilities = ?, last_seen_at = ? WHERE id = ?")
      .run(JSON.stringify(capabilities), now, id);
  }

  touch(id: string, now: string, uptimeSeconds?: number): void {
    this.db
      .prepare(
        "UPDATE connects SET last_seen_at = ?, status = 'online', uptime_seconds = COALESCE(?, uptime_seconds) WHERE id = ?",
      )
      .run(now, uptimeSeconds ?? null, id);
  }

  setStatus(id: string, status: ConnectionStatus, now: string): void {
    this.db.prepare("UPDATE connects SET status = ?, last_seen_at = ? WHERE id = ?").run(status, now, id);
  }

  getTokenHash(id: string): string | null {
    const row = this.db.prepare("SELECT token_hash FROM connects WHERE id = ?").get(id) as
      | { token_hash: string | null }
      | undefined;
    return row?.token_hash ?? null;
  }

  revoke(id: string): void {
    this.db.prepare("UPDATE connects SET revoked = 1, status = 'offline' WHERE id = ?").run(id);
  }
}
