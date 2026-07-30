import type { InterfacePluginContext, WidgetRenderProps } from "@streamdesk/interface-sdk";

/**
 * Interface-side component of `example-plugin`: a small custom widget
 * (rather than reusing the built-in Text widget) plus a preset bundling it
 * with an increment button, to show contributors the full shape of
 * `contributes.widgets` / `contributes.presets`.
 *
 * V1 note: this module is imported statically by the Interface app build
 * (see apps/interface/src/widgets/plugins.ts) rather than fetched and
 * loaded dynamically at runtime — see ARCHITECTURE.md for why true dynamic
 * loading of untrusted Interface code is out of scope for V1.
 */
function CounterDisplayWidget({ boundValues, properties }: WidgetRenderProps) {
  const label = typeof properties.label === "string" ? properties.label : "Compteur";
  const value = boundValues.value ?? 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderRadius: "var(--widget-radius)",
        border: "1px solid var(--deck-accent)",
        background: "var(--widget-background)",
        color: "var(--deck-text)",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 800, color: "var(--deck-accent)" }}>{String(value)}</span>
    </div>
  );
}

export function activate(context: InterfacePluginContext): void {
  context.widgets.register({
    type: "example.counter-display",
    pluginId: "example-plugin",
    displayName: "Affichage du compteur (exemple)",
    propertiesSchema: {
      type: "object",
      properties: { label: { type: "string" } },
    },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: CounterDisplayWidget,
  });

  context.presets.register({
    id: "example.counter-preset",
    pluginId: "example-plugin",
    displayName: "Compteur (exemple)",
    description: "Un bouton d'incrémentation et son affichage, prêts à déposer sur une page.",
    widgets: [
      {
        widgetType: "core.button",
        properties: { label: "Compteur +1" },
        defaultSize: { columnSpan: 1, rowSpan: 1 },
      },
      {
        widgetType: "example.counter-display",
        properties: { label: "Compteur" },
        defaultSize: { columnSpan: 1, rowSpan: 1 },
      },
    ],
  });
}

export default { activate };
