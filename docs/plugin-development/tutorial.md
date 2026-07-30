# Writing your first plugin

This walks through building a plugin from scratch, in the same shape as
`plugins/example-plugin` (open that folder side by side with this guide
— it's the same example, already finished). See `PLUGIN_API.md` for the
full SDK reference this tutorial only introduces piece by piece.

## 1. Create the plugin folder

```text
plugins/my-plugin/
  plugin.json
  server/index.js      (optional)
  connect/index.js      (optional)
  interface/index.tsx   (optional)
```

Minimal `plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "0.1.0",
  "apiVersion": "1",
  "license": "MIT",
  "author": { "name": "You" },
  "components": { "server": { "entrypoint": "./server/index.js" } },
  "contributes": { "actions": ["my-plugin.hello"] },
  "permissions": []
}
```

`id` must be a lowercase, dot/dash/underscore namespace (min 3 chars).
At least one of `components.server` / `.connect` / `.interface` is
required — start with just `server` for this tutorial.

## 2. Add an action

`server/index.js`:

```js
// @ts-check
/** @param {import("@streamdesk/server-sdk").ServerPluginContext} context */
export async function activate(context) {
  context.actions.register(
    {
      id: "my-plugin.hello",
      pluginId: "my-plugin",
      displayName: "Say hello",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
      executionLocation: "server",
    },
    async (request) => {
      const { name } = /** @type {{ name: string }} */ (request.input);
      context.logger.info(`Hello, ${name}!`);
      return { status: "success", output: { greeted: name } };
    },
  );
}
```

`inputSchema` is a JSON Schema, validated by the Server before your
handler ever runs — invalid input never reaches your code. Set
`executionLocation: "connect"` and skip the handler here if the action
should run on a Connect instead (see `plugins/example-plugin/server/index.js`'s
`example.counter.ping` for that shape, paired with a handler in
`connect/index.js`).

## 3. Add a data source

Data sources are how you expose a live value to widgets, independent of
which widget displays it (Règle 3).

```js
context.dataSources.register({
  id: "my-plugin.greeting-count",
  pluginId: "my-plugin",
  displayName: "Number of greetings",
  valueSchema: { type: "integer" },
  updateMode: "computed",
});

// ...later, whenever the value changes:
await context.dataSources.publish("my-plugin.greeting-count", newCount);
```

## 4. Add an event

Events are for "something happened", independent of who's listening.

```js
context.events.register({
  id: "my-plugin.greeted",
  pluginId: "my-plugin",
  payloadSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
});

// ...when it happens:
await context.events.publish({ eventType: "my-plugin.greeted", sourcePluginId: "my-plugin", payload: { name } });
```

Any Server-side plugin (including your own, or someone else's) can
subscribe: `context.events.subscribe("my-plugin.greeted", (event) => ...)`.

## 5. Add a widget (Interface component)

`interface/index.tsx`:

```tsx
import type { InterfacePluginContext, WidgetRenderProps } from "@streamdesk/interface-sdk";

function GreetingWidget({ boundValues }: WidgetRenderProps) {
  return <div>Greetings so far: {String(boundValues.value ?? 0)}</div>;
}

export function activate(context: InterfacePluginContext): void {
  context.widgets.register({
    type: "my-plugin.greeting-count",
    pluginId: "my-plugin",
    displayName: "Greeting count",
    propertiesSchema: { type: "object" },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: GreetingWidget,
  });
}
export default { activate };
```

**V1 caveat:** Interface plugin modules are statically imported by the
Interface app at build time (see `apps/interface/src/widgets/plugins.ts`
and the deviation note in `ARCHITECTURE.md`) rather than dynamically
fetched. To actually see your widget in the running app during
development, add an import + `activate()` call there, the same way
`example-plugin`'s is wired in. This is the one step of the tutorial that
isn't yet "just drop a folder in `plugins/`" — true dynamic loading is on
the roadmap.

## 6. Add a preset

Presets bundle widgets an operator commonly wants together:

```ts
context.presets.register({
  id: "my-plugin.greeting-preset",
  pluginId: "my-plugin",
  displayName: "Greeting",
  widgets: [
    { widgetType: "core.button", properties: { label: "Say hello" }, defaultSize: { columnSpan: 1, rowSpan: 1 } },
    { widgetType: "my-plugin.greeting-count", properties: {}, defaultSize: { columnSpan: 1, rowSpan: 1 } },
  ],
});
```

## 7. Test locally

1. `pnpm dev` from the repo root (Server + Connect + Interface).
2. The Server logs `Activated server plugin` with your plugin id on
   startup, or `Failed to activate server plugin` with the error if
   something's wrong — check the terminal running the Server.
3. Open `http://localhost:5173/admin/plugins` to confirm your plugin
   shows up, is `enabled`, and lists your action/data source/event.
4. Open `http://localhost:5173/admin/pages`, create or edit a page, and
   wire a widget's interaction to your action id (see
   `apps/server/src/bootstrap/seed.ts` for a worked JSON example of a
   widget with an interaction and a binding).
5. Switch to the Deck (`/`) and press the button — watch the Server's
   log for your `context.logger.info` line, and the bound widget update
   live.
6. Add a unit test next to your code (`*.test.ts`, run with
   `pnpm test`) the same way `apps/server/src/registries/action-registry.test.ts`
   tests the registry your action goes through.
