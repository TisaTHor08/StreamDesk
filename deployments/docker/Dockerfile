# StreamDesk Server — multi-stage Docker build.
#
# Builds the whole pnpm workspace and ships it as-is into the runtime
# image (see "Trade-off" note below), producing a single container that
# serves both the Server API/WebSocket and the built Interface PWA.
#
# NOTE: Connect is intentionally NOT built into this image. Connect talks
# to local software (OBS, a browser, OS shortcuts, ...) that generally
# does not exist inside a container — run Connect on the host instead. See
# deployments/docker/README.md.
#
# Trade-off: pnpm workspaces link sibling packages into node_modules via
# relative symlinks. The simplest way to keep those symlinks valid across
# Docker layers is to copy the *entire* built /workspace directory into
# the runtime stage, rather than cherry-picking dist/ folders (which is
# what a naive multi-stage Dockerfile usually tries, and breaks). This
# keeps devDependencies in the final image, which is not minimal — a
# future version should switch to `pnpm deploy` for a pruned, production-
# only bundle. Documented here and in ROADMAP.md rather than silently
# shipping something that half-works.

FROM node:20-bookworm-slim AS build
# python3/make/g++: better-sqlite3 falls back to compiling from source when
# no prebuilt binary matches the image's libc/arch (see ADR-009).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

WORKDIR /workspace
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY plugins ./plugins

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter "@streamdesk/shared-types" --filter "@streamdesk/protocol" \
      --filter "@streamdesk/plugin-manifest" --filter "@streamdesk/server-sdk" \
      --filter "@streamdesk/connect-sdk" --filter "@streamdesk/interface-sdk" \
      --filter "@streamdesk/ui-kit" build
RUN pnpm --filter "@streamdesk/server" build
RUN pnpm --filter "@streamdesk/interface" build

FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && useradd --create-home --uid 10001 streamdesk

WORKDIR /workspace
COPY --from=build /workspace /workspace

ENV NODE_ENV=production \
    DATA_DIR=/data \
    PLUGINS_DIR=/workspace/plugins \
    INTERFACE_DIST_DIR=/workspace/apps/interface/dist \
    HOST=0.0.0.0 \
    PORT=8080

RUN mkdir -p /data && chown -R streamdesk:streamdesk /data /workspace
USER streamdesk

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /workspace/apps/server
CMD ["node", "dist/index.js"]
