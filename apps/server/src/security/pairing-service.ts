import { generateToken, hashToken } from "./tokens.js";
import type { PairingRepository, PairingRole } from "../db/repositories/pairing.repo.js";

export type PairingService = {
  /** Issues a short-lived pairing token an operator can hand to a new device (e.g. via QR code). */
  issuePairingToken(role: PairingRole, label: string | undefined, ttlMinutes: number): string;
  /** Consumes a one-time pairing token. Returns true if it was valid. */
  consumePairingToken(token: string, role: PairingRole): boolean;
};

export function createPairingService(repo: PairingRepository): PairingService {
  return {
    issuePairingToken(role, label, ttlMinutes) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
      repo.create(hashToken(token), role, label, expiresAt);
      return token;
    },
    consumePairingToken(token, role) {
      return repo.consume(hashToken(token), role);
    },
  };
}
