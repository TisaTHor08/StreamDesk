# Installation

Pick the scenario that matches your setup — see `README.md`'s vision
section for the full description of each.

| Scenario | Server | Connect | Interface | Guide |
| --- | --- | --- | --- | --- |
| A — PC + tablet | Windows PC | Windows PC (local) | Tablet browser | `deployments/windows/README.md` |
| B — Raspberry Pi as Server | Raspberry Pi | Windows PC | Tablet browser | `deployments/raspberry/README.md` + `deployments/windows/README.md` |
| C — Raspberry Pi + touchscreen | Raspberry Pi | Windows PC | Raspberry Pi (kiosk Chromium) | `deployments/raspberry/README.md` ("Kiosk mode") |
| D — everything on one machine | same machine | same machine | same machine's browser | `README.md` "Quickstart" |
| Containerized Server | Docker | host machine | any browser | `deployments/docker/README.md` |

## Prerequisites (all scenarios)

- Node.js 20 LTS
- pnpm via Corepack (`corepack enable`)
- A modern browser for the Interface (Chrome/Chromium/Edge; Safari
  mobile works but is less tested — see `README.md`)

## First run, any scenario

```bash
pnpm install
pnpm build
pnpm test          # optional but recommended before relying on a build
```

Then follow the scenario-specific guide linked above for how to actually
start the Server/Connect/Interface long-term (systemd, a Windows service,
Docker, or just `pnpm dev` for local development).

## Pairing a new Interface or Connect

V1's default is "open registration": the first time an Interface or
Connect connects with a given id, the Server issues it a permanent token
automatically — no approval step. See
`docs/architecture/security.md` for what that means and how to find the
Server on your network (manual URL entry today; a QR-code / mDNS flow is
on the roadmap). Once paired, a device can be revoked from
`/admin/devices`.
