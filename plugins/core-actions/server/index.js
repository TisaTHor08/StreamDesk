// @ts-check
/**
 * Server-side component of the `core-actions` plugin.
 *
 * V1 plugins are loaded from a local, operator-controlled directory and
 * activated in-process (see docs/architecture/security.md for the trust
 * model). This file is intentionally plain ESM JavaScript — no build step
 * is required to run a plugin, only to type-check one during development.
 *
 * @param {import("@streamdesk/server-sdk").ServerPluginContext} context
 */
export async function activate(context) {
  context.actions.register(
    {
      id: "core.log.write",
      pluginId: "core-actions",
      displayName: "Écrire dans le journal",
      description: "Écrit un message dans le journal du serveur. Action sûre utilisable comme brique de test.",
      inputSchema: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["debug", "info", "warn", "error"] },
          message: { type: "string", minLength: 1 },
        },
        required: ["message"],
        additionalProperties: false,
      },
      outputSchema: { type: "object", properties: { written: { type: "boolean" } } },
      executionLocation: "server",
    },
    async (request) => {
      const input = /** @type {{ level?: string; message: string }} */ (request.input);
      const level = input.level ?? "info";
      const log = /** @type {Record<string, (msg: string) => void>} */ (
        /** @type {unknown} */ (context.logger)
      );
      (log[level] ?? context.logger.info)(input.message);
      return { status: "success", output: { written: true } };
    },
  );

  context.actions.register(
    {
      id: "core.delay",
      pluginId: "core-actions",
      displayName: "Attendre",
      description: "Attend un nombre de millisecondes donné avant de terminer avec succès.",
      inputSchema: {
        type: "object",
        properties: { ms: { type: "integer", minimum: 0, maximum: 60000 } },
        required: ["ms"],
        additionalProperties: false,
      },
      outputSchema: { type: "object", properties: { waitedMs: { type: "integer" } } },
      executionLocation: "server",
    },
    async (request) => {
      const input = /** @type {{ ms: number }} */ (request.input);
      await new Promise((resolve) => setTimeout(resolve, input.ms));
      return { status: "success", output: { waitedMs: input.ms } };
    },
  );

  // Connect-executed actions: only the *definition* is registered here
  // (for input validation + capability lookup); the actual handler lives
  // in connect/index.js and runs on whichever machine has a browser / OS
  // shell to act on.
  context.actions.register({
    id: "system.url.open",
    pluginId: "core-actions",
    displayName: "Ouvrir une URL",
    description: "Ouvre une URL http(s) dans le navigateur par défaut de la machine Connect.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", pattern: "^https?://" } },
      required: ["url"],
      additionalProperties: false,
    },
    executionLocation: "connect",
  });

  context.actions.register({
    id: "system.command.safe-example",
    pluginId: "core-actions",
    displayName: "Exemple sûr",
    description:
      "Action de démonstration volontairement limitée : elle NE lance PAS de commande système arbitraire, " +
      "elle journalise et renvoie simplement une note fournie par l'opérateur.",
    inputSchema: {
      type: "object",
      properties: { note: { type: "string", maxLength: 200 } },
      additionalProperties: false,
    },
    executionLocation: "connect",
  });

  context.dataSources.register({
    id: "system.hostname",
    pluginId: "core-actions",
    displayName: "Nom de machine (Connect)",
    valueSchema: { type: "string" },
    updateMode: "push",
  });
  context.dataSources.register({
    id: "system.platform",
    pluginId: "core-actions",
    displayName: "Plateforme (Connect)",
    valueSchema: { type: "string" },
    updateMode: "push",
  });
  context.dataSources.register({
    id: "system.currentTime",
    pluginId: "core-actions",
    displayName: "Heure courante (Connect)",
    valueSchema: { type: "string" },
    updateMode: "push",
  });
  context.dataSources.register({
    id: "connect.online",
    pluginId: "core-actions",
    displayName: "Au moins un Connect en ligne",
    description: "Mis à jour directement par le noyau du Serveur (voir ws/connect-connection.ts).",
    valueSchema: { type: "boolean" },
    updateMode: "push",
  });

  context.logger.info("core-actions server component activated");
}
