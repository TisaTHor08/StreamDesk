const STORAGE_KEY = "streamdesk.interface.identity";

export type StoredIdentity = {
  interfaceId: string;
  token: string | null;
  name: string;
};

function randomId(): string {
  return `interface_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function loadOrCreateIdentity(): StoredIdentity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredIdentity;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall through to an ephemeral identity.
  }
  const identity: StoredIdentity = { interfaceId: randomId(), token: null, name: "Nouvel écran" };
  persistIdentity(identity);
  return identity;
}

export function persistIdentity(identity: StoredIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // ignore
  }
}
