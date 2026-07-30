// @ts-check
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(__dirname, "scripts");

/**
 * Connect-side component of `windows-control`. Every action here shells
 * out to a small, single-purpose PowerShell script under ./scripts (see
 * that folder for the actual OS-level implementation of each one) — this
 * file's job is just wiring: run the right script with the right
 * arguments, parse its JSON stdout, and turn failures into a proper
 * ActionExecutionResult error rather than an unhandled crash.
 *
 * Honesty note: this was written and reviewed carefully, but never run on
 * a real Windows machine while building StreamDesk (no Windows environment
 * was available in this environment). Test each action once after
 * installing before relying on it, and check the Connect's own log output
 * if one fails — every script's stderr is forwarded there.
 *
 * @param {import("@streamdesk/connect-sdk").ConnectPluginContext} context
 */
export async function activate(context) {
  const ACTIONS = [
    "windows.open",
    "windows.app.focus",
    "windows.app.close",
    "windows.volume.set",
    "windows.volume.mute.toggle",
    "windows.mic.volume.set",
    "windows.mic.mute.toggle",
    "windows.brightness.set",
    "windows.wifi.set",
    "windows.wifi.toggle",
    "windows.audioDevice.setEnabled",
    "windows.audioDevice.toggle",
    "windows.power.lock",
    "windows.power.sleep",
    "windows.power.shutdown",
    "windows.power.restart",
    "windows.power.signOut",
    "windows.media.playPause",
    "windows.media.next",
    "windows.media.previous",
    "windows.media.stop",
    "windows.clipboard.setText",
    "windows.notification.show",
  ];
  const DATA_SOURCES = [
    "windows.activeWindow.title",
    "windows.activeWindow.processName",
    "windows.runningApps",
    "windows.audio.volume",
    "windows.audio.muted",
    "windows.mic.volume",
    "windows.mic.muted",
    "windows.brightness",
    "windows.wifi.enabled",
    "windows.wifi.connected",
    "windows.wifi.ssid",
    "windows.system.cpuUsage",
    "windows.system.gpuUsage",
    "windows.system.ramUsage",
    "windows.system.diskUsage",
  ];

  context.capabilities.register({
    id: "windows.control",
    version: "1.0.0",
    providerPluginId: "windows-control",
    actions: ACTIONS,
    events: [],
    dataSources: DATA_SOURCES,
  });

  const input = (raw, key, fallback) => {
    const value = /** @type {Record<string, unknown>} */ (raw ?? {})[key];
    return value === undefined ? fallback : value;
  };

  // ---- one-shot actions: spawn scripts/<name>.ps1, parse its JSON stdout ----

  context.actions.registerHandler("windows.open", (raw) =>
    runScript(context, "open.ps1", ["-Path", String(input(raw, "path", ""))].concat(
      input(raw, "args", "") ? ["-Args", String(input(raw, "args", ""))] : [],
    )),
  );

  context.actions.registerHandler("windows.app.focus", (raw) =>
    runScript(context, "app-focus.ps1", ["-ProcessName", String(input(raw, "processName", ""))]),
  );

  context.actions.registerHandler("windows.app.close", (raw) =>
    runScript(context, "app-close.ps1", ["-ProcessName", String(input(raw, "processName", ""))]),
  );

  context.actions.registerHandler("windows.volume.set", async (raw) => {
    const result = await runScript(context, "set-volume.ps1", ["-DataFlow", "0", "-Level", String(input(raw, "level", 50))]);
    await context.dataSources.publish("windows.audio.volume", result.level);
    return result;
  });

  context.actions.registerHandler("windows.volume.mute.toggle", async () => {
    const result = await runScript(context, "toggle-mute.ps1", ["-DataFlow", "0"]);
    await context.dataSources.publish("windows.audio.muted", result.muted);
    return result;
  });

  context.actions.registerHandler("windows.mic.volume.set", async (raw) => {
    const result = await runScript(context, "set-volume.ps1", ["-DataFlow", "1", "-Level", String(input(raw, "level", 50))]);
    await context.dataSources.publish("windows.mic.volume", result.level);
    return result;
  });

  context.actions.registerHandler("windows.mic.mute.toggle", async () => {
    const result = await runScript(context, "toggle-mute.ps1", ["-DataFlow", "1"]);
    await context.dataSources.publish("windows.mic.muted", result.muted);
    return result;
  });

  context.actions.registerHandler("windows.brightness.set", async (raw) => {
    const result = await runScript(context, "set-brightness.ps1", ["-Level", String(input(raw, "level", 50))]);
    await context.dataSources.publish("windows.brightness", result.level);
    return result;
  });

  context.actions.registerHandler("windows.wifi.set", (raw) =>
    runScript(context, "wifi.ps1", ["-Mode", input(raw, "enabled", true) ? "enable" : "disable"]),
  );
  context.actions.registerHandler("windows.wifi.toggle", () => runScript(context, "wifi.ps1", ["-Mode", "toggle"]));

  context.actions.registerHandler("windows.audioDevice.setEnabled", (raw) =>
    runScript(context, "audio-device.ps1", [
      "-NameContains",
      String(input(raw, "nameContains", "")),
      "-Mode",
      input(raw, "enabled", true) ? "enable" : "disable",
    ]),
  );
  context.actions.registerHandler("windows.audioDevice.toggle", (raw) =>
    runScript(context, "audio-device.ps1", ["-NameContains", String(input(raw, "nameContains", "")), "-Mode", "toggle"]),
  );

  context.actions.registerHandler("windows.power.lock", () => runScript(context, "power.ps1", ["-Mode", "lock"]));
  context.actions.registerHandler("windows.power.sleep", () => runScript(context, "power.ps1", ["-Mode", "sleep"]));
  context.actions.registerHandler("windows.power.shutdown", (raw) =>
    runScript(context, "power.ps1", ["-Mode", "shutdown", "-DelaySeconds", String(input(raw, "delaySeconds", 0))]),
  );
  context.actions.registerHandler("windows.power.restart", (raw) =>
    runScript(context, "power.ps1", ["-Mode", "restart", "-DelaySeconds", String(input(raw, "delaySeconds", 0))]),
  );
  context.actions.registerHandler("windows.power.signOut", () => runScript(context, "power.ps1", ["-Mode", "signOut"]));

  context.actions.registerHandler("windows.media.playPause", () => runScript(context, "media-key.ps1", ["-Key", "playPause"]));
  context.actions.registerHandler("windows.media.next", () => runScript(context, "media-key.ps1", ["-Key", "next"]));
  context.actions.registerHandler("windows.media.previous", () => runScript(context, "media-key.ps1", ["-Key", "previous"]));
  context.actions.registerHandler("windows.media.stop", () => runScript(context, "media-key.ps1", ["-Key", "stop"]));

  context.actions.registerHandler("windows.clipboard.setText", (raw) =>
    runScript(context, "clipboard-set.ps1", ["-Text", String(input(raw, "text", ""))]),
  );
  context.actions.registerHandler("windows.notification.show", (raw) =>
    runScript(context, "notify.ps1", ["-Title", String(input(raw, "title", "")), "-Message", String(input(raw, "message", ""))]),
  );

  // ---- continuous monitor: one persistent process feeding every "live" data source ----
  startMonitor(context, DATA_SOURCES);

  context.logger.info("windows-control connect component activated", { scriptsDir: SCRIPTS_DIR });
}

/**
 * Runs a PowerShell script under ./scripts with the given CLI arguments and
 * resolves with the JSON object it printed on its last stdout line. Uses
 * `spawn` with an argv array (not a shell string) throughout this plugin
 * so no user-supplied text (a path, a note, a process name...) is ever
 * interpreted by a shell — it only ever reaches PowerShell as an already-
 * separated, already-typed parameter.
 *
 * @param {import("@streamdesk/connect-sdk").ConnectPluginContext} context
 * @param {string} scriptName
 * @param {string[]} args
 * @returns {Promise<any>}
 */
function runScript(context, scriptName, args) {
  const scriptPath = join(SCRIPTS_DIR, scriptName);
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args], {
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        const message = stderr.trim() || `${scriptName} exited with code ${code}`;
        context.logger.warn("windows-control script failed", { scriptName, code, stderr: stderr.trim() });
        reject(new Error(message));
        return;
      }
      const lastLine = stdout.trim().split("\n").filter(Boolean).pop();
      try {
        resolve(lastLine ? JSON.parse(lastLine) : {});
      } catch {
        reject(new Error(`${scriptName} did not print valid JSON: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

/**
 * Spawns scripts/monitor.ps1 once and keeps it running for the lifetime of
 * the Connect process, publishing every field of every JSON line it prints
 * as the matching data source. Restarts it (with backoff) if it ever exits
 * — a single crashed metrics loop shouldn't require restarting all of
 * Connect.
 *
 * @param {import("@streamdesk/connect-sdk").ConnectPluginContext} context
 * @param {string[]} knownDataSourceIds
 */
function startMonitor(context, knownDataSourceIds) {
  const known = new Set(knownDataSourceIds);
  let restartDelayMs = 2000;

  const spawnMonitor = () => {
    const scriptPath = join(SCRIPTS_DIR, "monitor.ps1");
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
      windowsHide: true,
    });

    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      if (!line.trim()) return;
      let payload;
      try {
        payload = JSON.parse(line);
      } catch {
        return;
      }
      restartDelayMs = 2000; // a good line means the loop is healthy again
      for (const [key, value] of Object.entries(payload)) {
        if (known.has(key)) void context.dataSources.publish(key, value);
      }
    });

    child.stderr.on("data", (chunk) => {
      context.logger.warn("windows-control monitor stderr", { message: chunk.toString().trim() });
    });

    child.on("error", (error) => {
      context.logger.error("windows-control monitor failed to start", { error: error.message });
    });

    child.on("close", (code) => {
      context.logger.warn("windows-control monitor exited, restarting", { code, inMs: restartDelayMs });
      setTimeout(spawnMonitor, restartDelayMs);
      restartDelayMs = Math.min(restartDelayMs * 2, 30000);
    });
  };

  spawnMonitor();
}

export default { activate };
