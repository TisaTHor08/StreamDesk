#!/usr/bin/env bash
# StreamDesk — Raspberry Pi uninstall script.
#
# Stops and disables the systemd services, removes the unit files and the
# /opt/streamdesk install, but — by design — leaves /var/lib/streamdesk*
# (the SQLite database and plugin storage) and /etc/streamdesk (your
# config) untouched unless you pass --purge. Nothing destructive happens
# silently.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo ./uninstall.sh)." >&2
  exit 1
fi

PURGE=false
if [[ "${1:-}" == "--purge" ]]; then
  PURGE=true
fi

echo "==> Stopping services"
systemctl disable --now streamdesk-server.service 2>/dev/null || true
systemctl disable --now streamdesk-connect.service 2>/dev/null || true

echo "==> Removing systemd units"
rm -f /etc/systemd/system/streamdesk-server.service /etc/systemd/system/streamdesk-connect.service
systemctl daemon-reload

echo "==> Removing /opt/streamdesk"
rm -rf /opt/streamdesk

if $PURGE; then
  echo "==> --purge given: removing data and config too"
  read -r -p "This deletes /var/lib/streamdesk*, /var/log/streamdesk and /etc/streamdesk permanently. Type 'yes' to confirm: " confirm
  if [[ "$confirm" == "yes" ]]; then
    rm -rf /var/lib/streamdesk /var/lib/streamdesk-connect /var/log/streamdesk /etc/streamdesk
    userdel streamdesk 2>/dev/null || true
    echo "Purged."
  else
    echo "Aborted purge; data and config were left in place."
  fi
else
  echo "==> Keeping /var/lib/streamdesk*, /var/log/streamdesk and /etc/streamdesk. Re-run with --purge to remove them too."
fi

echo "==> Done."
