import type Database from "better-sqlite3";

export type PairingRole = "interface" | "connect";

export class PairingRepository {
  constructor(private readonly db: Database.Database) {}

  create(tokenHash: string, role: PairingRole, label: string | undefined, expiresAt: string | null): void {
    this.db
      .prepare(
        `INSERT INTO pairing_tokens (token_hash, role, label, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(tokenHash, role, label ?? null, new Date().toISOString(), expiresAt);
  }

  /** Returns the role if the token is valid (exists, unused, unexpired), and marks it used. */
  consume(tokenHash: string, expectedRole: PairingRole): boolean {
    const row = this.db.prepare("SELECT * FROM pairing_tokens WHERE token_hash = ?").get(tokenHash) as
      | { role: string; expires_at: string | null; used_at: string | null }
      | undefined;

    if (!row || row.role !== expectedRole || row.used_at) return false;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false;

    this.db
      .prepare("UPDATE pairing_tokens SET used_at = ? WHERE token_hash = ?")
      .run(new Date().toISOString(), tokenHash);
    return true;
  }
}
