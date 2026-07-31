/**
 * `crypto.randomUUID()` only exists in a "secure context" (HTTPS, or
 * `http://localhost`/`127.0.0.1`) — per spec, browsers strip it (along with
 * `crypto.subtle`) from `window.crypto` entirely everywhere else, including
 * a perfectly normal `http://192.168.x.x:5173` LAN address. StreamDesk is
 * explicitly meant to be opened that way from a phone/tablet on the same
 * network (see the QR pairing flow), so calling `crypto.randomUUID()`
 * directly used to crash the very first component that ran on page load
 * (ConnectionProvider, building this device's identity) with no error
 * boundary to catch it — the entire React tree unmounted, leaving a blank
 * screen with nothing in the DOM and no visible explanation.
 *
 * `crypto.getRandomValues()`, unlike `randomUUID()`, IS available in
 * insecure contexts (it doesn't expose anything about the page's own
 * network traffic the way `subtle` would), so this builds a spec-compliant
 * RFC 4122 v4 UUID from it by hand whenever the native `randomUUID` isn't
 * available. Use this everywhere in the Interface app instead of calling
 * `crypto.randomUUID()` directly.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    // Extremely defensive fallback (Math.random isn't cryptographically
    // secure) for the vanishingly unlikely case a browser exposes neither
    // API — good enough for a client-side identifier, never used for
    // anything security-sensitive.
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
