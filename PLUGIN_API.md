# Plugin API reference

For a hands-on tutorial, see `docs/plugin-development/tutorial.md`. This
file is the reference: the manifest schema and the three SDK surfaces.

## Manifest (`plugin.json`)

```jsonc
{
  "id": "community.example",       // lowercase, dot/dash/underscore namespace, min 3 chars
  "name": "Example Plugin",
  "version": "1.0.0",
  "apiVersion": "1",               // must match the platform's SUPPORTED_PLUGIN_API_VERSION
  "license": "MIT",
  "description": "Optional.",
  "author": { "name": "Someone", "url": "https://...", "email": "..." },
  "components": {                  // at least one of the three is required
    "server":    { "entrypoint": "./server/index.js" },
    "connect":   { "entrypoint": "./connect/index.js", "platforms": ["windows","linux","macos"], "architectures": ["x64","arm64"] },
    "interface": { "entrypoint": "./interface/index.tsx" }
  },
  "contributes": {                 // documentation only — not enforced against actual registrations in V1
    "actions": [], "events": [], "dataSources": [], "widgets": [], "presets": [], "themes": []
  },
  "permissions": []                 // must be a subset of the known permission list below
}
```

Known permissions (declared, stored, shown to the operator — **not
enforced** in V1, see `docs/architecture/security.md`):
`network.local`, `network.internet`, `filesystem.read`,
`filesystem.write`, `process.launch`, `process.observe`,
`input.keyboard`, `input.mouse`, `clipboard.read`, `clipboard.write`,
`events.publish`, `events.subscribe`, `plugin.storage`,
`plugin.interop`.

Component entrypoints are **plain ESM JavaScript** (`.js`, or `.tsx` for
the Interface side — see the deviation note in ARCHITECTURE.md). No
build step is required to load a plugin; use `// @ts-check` and JSDoc if
you want editor type-checking against the SDK types during development.

## Server SDK (`@streamdesk/server-sdk`)

Your `server/index.js` must export `activate(context)`:

```ts
type ServerPluginContext = {
  plugin: { id: string; version: string };
  actions: {
    register(definition: ActionDefinition, handler?: ActionHandler): void; // handler required iff executionLocation === "server"
    execute(request: ActionExecutionRequest): Promise<ActionExecutionResult>;
  };
  events: {
    register(definition: EventDefinition): void;
    publish(event: Omit<PublishedEvent, "eventId" | "timestamp">): Promise<void>;
    subscribe(eventType: string, handler: EventHandler): Unsubscribe;
  };
  dataSources: {
    register(definition: DataSourceDefinition): void;
    getLatest(dataSourceId: string): Promise<DataSourceValue | null>;
    subscribe(dataSourceId: string, handler: DataSourceHandler): Unsubscribe;
    publish(dataSourceId: string, value: unknown): Promise<void>; // see ARCHITECTURE.md deviation #1
  };
  storage: PluginStorage;   // get/set/delete/keys, namespaced per plugin (SQLite-backed)
  logger: PluginLogger;     // debug/info/warn/error
};
```

An `ActionHandler` returns
`Promise<Pick<ActionExecutionResult, "status" | "output" | "error">>` —
see `plugins/core-actions/server/index.js` and
`plugins/example-plugin/server/index.js` for real examples.

## Connect SDK (`@streamdesk/connect-sdk`)

Your `connect/index.js` must export `activate(context)`:

```ts
type ConnectPluginContext = {
  plugin: { id: string; version: string };
  capabilities: { register(capability: CapabilityDescriptor): void };
  actions: { registerHandler(actionId: string, handler: (input: unknown) => Promise<unknown>): void };
  events: { publish(eventType: string, payload: unknown): Promise<void> };
  dataSources: { publish(dataSourceId: string, value: unknown): Promise<void> };
  storage: PluginStorage;   // JSON-file backed on Connect (no local DB — Connect stays lightweight)
  logger: PluginLogger;
  system: { platform: string; architecture: string; hostname: string };
};
```

Register one `CapabilityDescriptor` per logical group of
actions/events/data sources you provide — the Server uses
`capabilities.actions` to decide which Connect(s) can run a given
`connect`-executed action.

## Interface SDK (`@streamdesk/interface-sdk`)

Your `interface/index.tsx` must export `activate(context)` (see the
deviation note in ARCHITECTURE.md about *how* this gets loaded in V1):

```ts
type InterfacePluginContext = {
  plugin: { id: string; version: string };
  widgets: { register(definition: WidgetDefinition): void };
  presets: { register(definition: PresetDefinition): void };
  themes: { register(definition: ThemeDefinition): void };
};

type WidgetDefinition = {
  type: string;                 // e.g. "example.counter-display"
  pluginId: string;
  displayName: string;
  propertiesSchema: JsonSchema; // used by the admin editor (informational in V1)
  defaultSize: { columnSpan: number; rowSpan: number };
  component: React.ComponentType<WidgetRenderProps>;
};

type WidgetRenderProps = {
  widgetId: string;
  properties: Record<string, unknown>;
  boundValues: Record<string, unknown>; // resolved binding values, keyed by widget property
  active: boolean;
  disabled?: boolean;
  onPress?(): void; onRelease?(): void; onLongPress?(): void;
};
```

Widgets are **declarative** in V1: a plain React component plus a
properties schema. There is no sandboxing of Interface plugin code (it
runs with the same privileges as the rest of the Interface bundle) — see
`docs/architecture/security.md`.

## Full worked example

`plugins/example-plugin/` implements all three components end to end (a
persisted counter, a Server action, a Connect action, an event, a data
source, a custom widget, and a preset) and is the best companion to this
reference — read it alongside `docs/plugin-development/tutorial.md`.
