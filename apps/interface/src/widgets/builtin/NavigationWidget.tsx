import type { WidgetRenderProps } from "@streamdesk/interface-sdk";

export function NavigationWidget({ properties }: WidgetRenderProps) {
  const label = typeof properties.label === "string" ? properties.label : "Aller à...";
  return (
    <button
      type="button"
      className="sd-widget sd-widget--navigation"
      style={{
        background: "var(--deck-accent)",
        border: "none",
        borderRadius: "var(--widget-radius)",
        boxShadow: "var(--widget-shadow)",
        color: "white",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--spacing-sm)",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {label} →
    </button>
  );
}
