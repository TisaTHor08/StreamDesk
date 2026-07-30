// @ts-check
/**
 * Connect-side component of `example-plugin` — a minimal example of a
 * Connect-executed action that has nothing to do with the counter, purely
 * to demonstrate the shape of `actions.registerHandler`.
 *
 * @param {import("@streamdesk/connect-sdk").ConnectPluginContext} context
 */
export async function activate(context) {
  context.capabilities.register({
    id: "example.ping",
    version: "1.0.0",
    providerPluginId: "example-plugin",
    actions: ["example.counter.ping"],
    events: [],
    dataSources: [],
  });

  context.actions.registerHandler("example.counter.ping", async () => {
    context.logger.debug("Received ping");
    return { pong: true, at: new Date().toISOString() };
  });

  context.logger.info("example-plugin connect component activated");
}
