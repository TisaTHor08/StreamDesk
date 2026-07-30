# Docker (Server only)

This runs the **Server** (and serves the built **Interface** PWA) in a
container. **Connect must run on the host** (or on whichever machine needs
to control OBS, open URLs, etc.) — see `deployments/windows` and
`deployments/raspberry`, or just `pnpm --filter @streamdesk/connect dev`.

## Build & run

```bash
cd deployments/docker
docker compose up --build
```

The Server will be reachable at `http://localhost:8080`. Point Connect and
the Interface at that address (`SERVER_URL=ws://<host>:8080` for Connect,
open `http://<host>:8080` in a browser for the Interface).

## Data persistence

The SQLite database and plugin storage live in the `streamdesk-data`
named volume, mounted at `/data` inside the container.

## Known limitation (V1)

The image ships the full pnpm workspace (including devDependencies)
rather than a pruned production bundle — see the comment at the top of
`Dockerfile`. This keeps the multi-stage build simple and correct at the
cost of image size; switching to `pnpm deploy` is tracked in
`ROADMAP.md`.
