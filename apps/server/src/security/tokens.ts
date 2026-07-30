import { randomBytes, createHash } from "node:crypto";

/** Generates a URL-safe pairing/session token. Never logged in plaintext. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Tokens are stored hashed (SHA-256) — the raw token never touches disk. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}
