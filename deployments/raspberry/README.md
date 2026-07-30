# Raspberry Pi (Raspberry Pi OS 64-bit)

Covers Scenario B (Pi as Server only) and Scenario C (Pi as Server +
kiosk Interface). Requires **Raspberry Pi OS 64-bit** (ARM64) and Node.js
20 LTS.

## 1. Install Node.js 20 (ARM64)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should print v20.x, linux-arm64
```

## 2. Build the project (on the Pi, or cross-built and copied over)

```bash
corepack enable
pnpm install
pnpm build
```

## 3. Install as a system service

```bash
sudo ./deployments/raspberry/install.sh "$(pwd)"
```

This installs Server + Connect as systemd services running under a
dedicated `streamdesk` user, with data in `/var/lib/streamdesk*`, config
in `/etc/streamdesk`, and logs in `/var/log/streamdesk`. See
`install.sh`'s header comment for exactly what it does and does not do.

Server-only Pi (Scenario B)? You can skip Connect: comment out or don't
enable `streamdesk-connect.service` — Connect will run on the Windows/
Linux machine that has the software to control.

## 4. Kiosk mode (Scenario C only)

If this Pi also has a touchscreen and a desktop session (Raspberry Pi OS
"with desktop", not "Lite"), point the session's autostart at
`kiosk.sh`:

```bash
mkdir -p ~/.config/lxsession/LXDE-pi
cat >> ~/.config/lxsession/LXDE-pi/autostart <<'EOF'
@/opt/streamdesk-repo/deployments/raspberry/kiosk.sh
EOF
```

(Adjust the path to wherever you keep the repo checkout, or copy
`kiosk.sh` somewhere stable first.) `kiosk.sh` waits for `/health` to
respond before launching Chromium, so it's safe to run at boot.

## Uninstall

```bash
sudo ./deployments/raspberry/uninstall.sh          # keeps data/config
sudo ./deployments/raspberry/uninstall.sh --purge  # also deletes data/config, asks first
```

## Directory layout

```text
/opt/streamdesk        built server/connect/interface + plugins
/etc/streamdesk         server.env, connect.env
/var/lib/streamdesk     Server SQLite database + plugin storage
/var/lib/streamdesk-connect  Connect's local plugin storage
/var/log/streamdesk     server.log, connect.log
```

## Known ARM64 caveat

`better-sqlite3` (used by the Server) is a native Node addon. It ships
prebuilt binaries for `linux-arm64`, so a plain `pnpm install` normally
just works — but if `pnpm install` ever falls back to compiling from
source on-device, install build tools first:

```bash
sudo apt-get install -y python3 make g++
```

See ADR-009 for the full ARM64 compatibility discussion.
