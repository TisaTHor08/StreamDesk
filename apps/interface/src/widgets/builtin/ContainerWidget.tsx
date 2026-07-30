import type { WidgetRenderProps } from "@streamdesk/interface-sdk";

/**
 * V1 container: a purely visual grouping box. True nested widget
 * composition is a future extension point (see ROADMAP.md) — the type is
 * already part of the contract so pages can adopt it without a schema
 * migration later.
 */
export function ContainerWidget({ properties }: WidgetRenderProps) {
  const label = typeof properties.label === "string" ? properties.label : undefined;
  return (
    <div
      className="sd-widget sd-widget--container"
      style={{
        width: "100%",
        height: "100%",
        border: "1px dashed var(--widget-border)",
        borderRadius: "var(--widget-radius)",
        padding: "var(--spacing-sm)",
        color: "var(--deck-muted-text)",
        fontSize: 12,
      }}
    >
      {label}
    </div>
  );
}
