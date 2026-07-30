# Roadmap

## What V1 actually delivers

A working skeleton across all three roles, not a mockup: versioned/
validated protocol, SQLite persistence with migrations, a real action
router (server-execution, connect-routing, timeouts, typed errors), a
minimal plugin system with two working plugins, a Deck renderer with
pluggable widgets, a simple admin editor, Docker/Raspberry Pi/Windows
deployment docs, and unit/integration/e2e tests. See `README.md`
"Status of this V1" and the acceptance criteria this was built against
(originally spec section 37).

## Explicitly out of scope for V1

Carried over from the original spec (section 34) — these are not
"forgotten", they're deliberately deferred so V1 could ship a coherent,
testable core instead of a half-built version of everything:

- Public plugin marketplace / registry
- Cryptographic signing of plugins
- A real plugin sandbox (V1 plugins are trusted, in-process code)
- A Node-RED-style automation engine (the event bus API exists; no visual
  editor)
- Complex graphical macros
- Cloud sync, remote accounts, public internet access by default
- Advanced multi-user access control
- Arbitrary/sandboxed Interface widget code (widgets are declarative)
- Fusion 360 add-in, Visual Studio extension, Minecraft mod/plugin
- Full OBS / Home Assistant integrations (the Connect model supports
  building these as plugins — none is bundled in V1)
- Full auto-update
- A ready-to-flash Raspberry Pi image

None of the above required changing a core contract to add later — that
was the actual design constraint for V1 (see ARCHITECTURE.md).

## Near-term (post-V1) priorities

1. **Dynamic Interface plugin loading.** V1 statically links
   `example-plugin`'s Interface component at build time (see
   ARCHITECTURE.md, deviation #3). Making this dynamic needs a real
   loading + isolation story (iframes? a restricted component API?) —
   worth its own design pass rather than bolting it on.
2. **Enforce plugin permissions.** Right now they're declared and shown,
   not enforced. Likely needs moving plugin execution out of the Server
   process (worker threads or child processes) to mean anything.
3. **Pairing approval UI.** The pairing-token endpoint
   (`POST /api/pairing-tokens`) exists; wire it into the Interface/Connect
   registration flow as the default instead of auto-issuing tokens, and
   add a "pending pairing requests" admin screen.
4. **TLS by default** for the Docker/Raspberry Pi deployment paths (a
   bundled reverse-proxy config, e.g. Caddy with automatic HTTPS).
5. **mDNS Server discovery** (the QR-code / manual-URL pairing flow works
   today; auto-discovery is next).
6. **`pnpm deploy`-based Docker image** to stop shipping devDependencies
   in the runtime container (see the trade-off note in
   `deployments/docker/Dockerfile`).
7. **Real widget property editor** in Admin (today: structured fields for
   position/type, raw JSON textareas for properties/interactions/
   bindings — functional, not pretty).
8. **First community integrations** as actual plugins: OBS via its
   WebSocket API, Home Assistant via REST/WebSocket, Philips Hue via its
   local API — each is a natural "second and third plugin" to validate
   the plugin contract against something StreamDesk's own authors didn't
   design.

## Non-goals for the foreseeable future

Anything that would require the Server core to know about a specific
piece of software. That line is the one architectural rule this project
is least willing to bend (Règle 1 in ARCHITECTURE.md).
