// @ts-check
/**
 * Server-side component of `example-plugin`. Demonstrates the full loop a
 * contributor would build: a Server-executed action, a data source it
 * drives, and an event it emits — see docs/plugin-development for the
 * step-by-step tutorial this plugin illustrates.
 *
 * @param {import("@streamdesk/server-sdk").ServerPluginContext} context
 */
export async function activate(context) {
  context.dataSources.register({
    id: "example.counter.value",
    pluginId: "example-plugin",
    displayName: "Valeur du compteur",
    valueSchema: { type: "integer" },
    updateMode: "computed",
  });

  context.events.register({
    id: "example.counter.changed",
    pluginId: "example-plugin",
    payloadSchema: {
      type: "object",
      properties: { value: { type: "integer" } },
      required: ["value"],
    },
  });

  context.actions.register(
    {
      id: "example.counter.increment",
      pluginId: "example-plugin",
      displayName: "Incrémenter le compteur",
      description: "Incrémente un compteur persistant stocké côté serveur (plugin.storage) et publie la nouvelle valeur.",
      inputSchema: {
        type: "object",
        properties: { step: { type: "integer", minimum: 1, maximum: 100 } },
        additionalProperties: false,
      },
      outputSchema: { type: "object", properties: { value: { type: "integer" } } },
      executionLocation: "server",
    },
    async (request) => {
      const input = /** @type {{ step?: number }} */ (request.input ?? {});
      const step = input.step ?? 1;

      const current = /** @type {number | null} */ (await context.storage.get("count"));
      const next = (current ?? 0) + step;
      await context.storage.set("count", next);

      await context.dataSources.publish("example.counter.value", next);
      await context.events.publish({
        eventType: "example.counter.changed",
        sourcePluginId: "example-plugin",
        payload: { value: next },
      });

      return { status: "success", output: { value: next } };
    },
  );

  // Connect-executed action: only the definition lives here, the handler
  // is implemented in connect/index.js.
  context.actions.register({
    id: "example.counter.ping",
    pluginId: "example-plugin",
    displayName: "Ping (Connect)",
    description: "Action d'exemple exécutée sur un Connect, sans lien avec le compteur — sert uniquement de modèle.",
    inputSchema: { type: "object", additionalProperties: false },
    outputSchema: { type: "object", properties: { pong: { type: "boolean" } } },
    executionLocation: "connect",
  });

  // Publish the persisted (or default) value immediately so a freshly
  // opened Interface never shows an empty/undefined counter.
  const initial = /** @type {number | null} */ (await context.storage.get("count"));
  await context.dataSources.publish("example.counter.value", initial ?? 0);

  context.logger.info("example-plugin server component activated");
}
