#!/usr/bin/env bash
# StreamDesk — Raspberry Pi OS (64-bit) install script.
#
# What this does:
#   1. Verifies architecture and required tools.
#   2. Creates a dedicated, unprivileged `streamdesk` system user.
#   3. Creates /opt/streamdesk, /etc/streamdesk, /var/lib/streamdesk*,
#      /var/log/streamdesk.
#   4. Copies the ALREADY-BUILT server/connect/interface artifacts from
#      this repo checkout into /opt/streamdesk.
#   5. Installs and enables the systemd units for Server + Connect.
#
# What this deliberately does NOT do:
#   - It does not run `pnpm build` for you — build the project first
#     (`pnpm install && pnpm build` from the repo root) so you know
#     exactly what is being deployed.
#   - It does not touch your desktop/autostart config for kiosk mode —
#     see the "Kiosk mode" section of README.md, a manual step by design
#     since not every install has (or wants) a graphical session.
#   - It does not overwrite an existing /etc/streamdesk/*.env if present.
#
# Usage: sudo ./install.sh /path/to/streamdesk/repo

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo ./install.sh <repo-path>)." >&2
  exit 1
fi

REPO_DIR="${1:-}"
if [[ -z "$REPO_DIR" || ! -d "$REPO_DIR" ]]; then
  echo "Usage: sudo ./install.sh /path/to/streamdesk/repo" >&2
  exit 1
fi
REPO_DIR="$(cd "$REPO_DIR" && pwd)"

ARCH="$(uname -m)"
if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
  echo "Warning: expected aarch64/arm64, detected '$ARCH'. Continuing anyway." >&2
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found on PATH. Install Node.js 20 LTS (ARM64) first, e.g. via nodesource or nvm." >&2
  exit 1
fi

for artifact in \
  "apps/server/dist" \
  "apps/connect/dist" \
  "apps/interface/dist" \
  "plugins"; do
  if [[ ! -e "$REPO_DIR/$artifact" ]]; then
    echo "Missing build artifact: $REPO_DIR/$artifact" >&2
    echo "Run 'pnpm install && pnpm build' from the repo root before installing." >&2
    exit 1
  fi
done

echo "==> Creating streamdesk system user"
id -u streamdesk >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/streamdesk --shell /usr/sbin/nologin streamdesk

echo "==> Creating directories"
install -d -o streamdesk -g streamdesk /opt/streamdesk
install -d -o streamdesk -g streamdesk /opt/streamdesk/server /opt/streamdesk/connect /opt/streamdesk/interface-dist /opt/streamdesk/plugins
install -d -o root -g root /etc/streamdesk
install -d -o streamdesk -g streamdesk /var/lib/streamdesk /var/lib/streamdesk-connect
install -d -o streamdesk -g streamdesk /var/log/streamdesk

echo "==> Copying build artifacts"
rsync -a --delete "$REPO_DIR/apps/server/dist/" /opt/streamdesk/server/dist/ 2>/dev/null || cp -r "$REPO_DIR/apps/server/dist" /opt/streamdesk/server/
rsync -a --delete "$REPO_DIR/apps/server/node_modules/" /opt/streamdesk/server/node_modules/ 2>/dev/null || cp -r "$REPO_DIR/apps/server/node_modules" /opt/streamdesk/server/ || true
rsync -a --delete "$REPO_DIR/apps/connect/dist/" /opt/streamdesk/connect/dist/ 2>/dev/null || cp -r "$REPO_DIR/apps/connect/dist" /opt/streamdesk/connect/
rsync -a --delete "$REPO_DIR/apps/connect/node_modules/" /opt/streamdesk/connect/node_modules/ 2>/dev/null || cp -r "$REPO_DIR/apps/connect/node_modules" /opt/streamdesk/connect/ || true
rsync -a --delete "$REPO_DIR/apps/interface/dist/" /opt/streamdesk/interface-dist/ 2>/dev/null || cp -r "$REPO_DIR/apps/interface/dist/." /opt/streamdesk/interface-dist/
rsync -a --delete "$REPO_DIR/plugins/" /opt/streamdesk/plugins/ 2>/dev/null || cp -r "$REPO_DIR/plugins/." /opt/streamdesk/plugins/
chown -R streamdesk:streamdesk /opt/streamdesk

echo "==> Installing config files (won't overwrite existing ones)"
[[ -f /etc/streamdesk/server.env ]] || cp "$(dirname "$0")/server.env.example" /etc/streamdesk/server.env
[[ -f /etc/streamdesk/connect.env ]] || cp "$(dirname "$0")/connect.env.example" /etc/streamdesk/connect.env

echo "==> Installing systemd units"
cp "$(dirname "$0")/streamdesk-server.service" /etc/systemd/system/streamdesk-server.service
cp "$(dirname "$0")/streamdesk-connect.service" /etc/systemd/system/streamdesk-connect.service
systemctl daemon-reload
systemctl enable --now streamdesk-server.service
systemctl enable --now streamdesk-connect.service

echo ""
echo "==> Done."
echo "Server:  http://$(hostname -I | awk '{print $1}'):8080"
echo "Logs:    journalctl -u streamdesk-server -f   /   journalctl -u streamdesk-connect -f"
echo ""
echo "For kiosk mode (Scenario C), see the 'Kiosk mode' section of README.md."
