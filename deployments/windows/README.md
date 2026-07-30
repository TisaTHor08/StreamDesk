# Windows

Covers Scenario A (PC Windows as Server + local Connect) and Scenario D
(everything on one Windows machine for development).

## Development

```powershell
.\deployments\windows\install-dev.ps1
pnpm dev
```

`pnpm dev` runs the Server, Connect, and the Interface's Vite dev server
together. Open `http://localhost:5173` for the Interface (it proxies
`/api` and `/ws` to the Server on `:8080` — see
`apps/interface/vite.config.ts`), or `http://localhost:8080/admin` for
Administration once the Interface has been built and is being served by
the Server itself.

To clean up:

```powershell
.\deployments\windows\uninstall-dev.ps1
```

## Production-ish bundle

There is no Windows installer / MSI in V1 (explicitly out of scope — see
ROADMAP.md). To run a built copy:

```powershell
pnpm build
$env:DATA_DIR = "C:\ProgramData\StreamDesk"
node apps\server\dist\index.js
# in another terminal:
node apps\connect\dist\index.js
```

Administration stays reachable from any browser on the machine (or the
network) at `http://localhost:8080/admin` — no separate desktop app is
required, by design (see ARCHITECTURE.md, "Interface must be
interchangeable").

## Autostart

For local development, autostart isn't necessary. For a more permanent
Windows install, the two common documented options are:

1. **Task Scheduler**: create a task that runs
   `node C:\path\to\apps\server\dist\index.js` (and one for Connect) "At
   startup", running as your user or a service account. This is the
   simplest option and needs no extra tooling.
2. **NSSM** (Non-Sucking Service Manager, third-party, not bundled):
   wraps `node apps\server\dist\index.js` as a proper Windows service.
   `nssm install StreamDeskServer node.exe C:\path\to\apps\server\dist\index.js`.

Either way, set `DATA_DIR`, `PLUGINS_DIR`, and `PORT` as environment
variables on the task/service, matching `apps/server/src/config.ts`.
