import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

export type ConnectIdentity = {
  connectId: string;
  token: string | null;
};

/**
 * Persists this Connect instance's stable id (and, once issued, its
 * permanent Server token) to disk so reconnects and restarts keep the same
 * identity instead of re-pairing every time.
 */
export function loadOrCreateIdentity(dataDir: string): ConnectIdentity {
  const identityPath = join(dataDir, "identity.json");

  if (existsSync(identityPath)) {
    return JSON.parse(readFileSync(identityPath, "utf-8")) as ConnectIdentity;
  }

  const identity: ConnectIdentity = {
    connectId: `connect_${randomBytes(8).toString("hex")}`,
    token: null,
  };
  writeFileSync(identityPath, JSON.stringify(identity, null, 2));
  return identity;
}

export function saveIdentity(dataDir: string, identity: ConnectIdentity): void {
  writeFileSync(join(dataDir, "identity.json"), JSON.stringify(identity, null, 2));
}
