#!/usr/bin/env bash
# Launches Chromium in kiosk mode against the local StreamDesk Server, for
# Scenario C (Raspberry Pi as both Server and touchscreen Interface).
#
# Intended to be run from an autostart entry for the desktop session, e.g.
# ~/.config/lxsession/LXDE-pi/autostart or a systemd --user unit. It is
# NOT installed automatically by install.sh (kiosk mode requires a
# graphical session, which a headless Server-only Pi won't have) — see
# deployments/raspberry/README.md for the manual step.

set -euo pipefail

STREAMDESK_URL="${STREAMDESK_URL:-http://localhost:8080}"

# Give the Server a moment to come up on boot before pointing the browser at it.
for _ in $(seq 1 30); do
  if curl -fsS "${STREAMDESK_URL}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

exec chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  "${STREAMDESK_URL}"
