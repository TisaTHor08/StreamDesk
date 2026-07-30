// @ts-check
import { exec } from "node:child_process";
import os from "node:os";

/**
 * Connect-side component of the `core-actions` plugin: declares the
 * capability this Connect instance offers, implements the two
 * Connect-executed actions, and periodically publishes a few basic system
 * data sources.
 *
 * @param {import("@streamdesk/connect-sdk").ConnectPluginContext} context
 */
export async function activate(context) {
  context.capabilities.register({
    id: "core.system",
    version: "1.0.0",
    providerPluginId: "core-actions",
    actions: ["system.url.open", "system.command.safe-example"],
    events: [],
    dataSources: ["system.hostname", "system.platform", "system.currentTime"],
  });

  context.actions.registerHandler("system.url.open", async (input) => {
    const { url } = /** @type {{ url: string }} */ (input);
    if (!/^https?:\/\//.test(url)) {
      throw new Error("Only http(s) URLs may be opened");
    }
    await openUrl(url);
    context.logger.info("Opened URL", { url });
    return { opened: true, url };
  });

  context.actions.registerHandler("system.command.safe-example", async (input) => {
    // Deliberately does NOT execute an arbitrary system command — see
    // docs/architecture/security.md and Règle "pas de commande système
    // arbitraire exposée" in the platform's architectural rules. This is
    // a safe, fixed no-op that just echoes back an operator-supplied note.
    const { note } = /** @type {{ note?: string }} */ (input ?? {});
    context.logger.info("safe-example action invoked", { note });
    return { acknowledged: true, note: note ?? null };
  });

  publishStaticDataSources(context);
  setInterval(() => publishCurrentTime(context), 5000);
  publishCurrentTime(context);

  context.logger.info("core-actions connect component activated", context.system);
}

function publishStaticDataSources(context) {
  void context.dataSources.publish("system.hostname", context.system.hostname);
  void context.dataSources.publish("system.platform", `${context.system.platform}/${context.system.architecture}`);
}

function publishCurrentTime(context) {
  void context.dataSources.publish("system.currentTime", new Date().toISOString());
}

/** Cross-platform "open URL in default browser" without extra dependencies. */
function openUrl(url) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const command =
      platform === "win32"
        ? `start "" "${url}"`
        : platform === "darwin"
          ? `open "${url}"`
          : `xdg-open "${url}"`;

    exec(command, (error) => {
      if (error) reject(error);
      else resolve(undefined);
    });
  });
}
