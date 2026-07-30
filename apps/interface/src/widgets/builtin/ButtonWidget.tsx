import type { WidgetRenderProps } from "@streamdesk/interface-sdk";

export function ButtonWidget({ properties, active, disabled }: WidgetRenderProps) {
  const label = typeof properties.label === "string" ? properties.label : "";
  return (
    <button
      type="button"
      disabled={disabled}
      className="sd-widget sd-widget--button"
      data-active={active || undefined}
      style={{
        background: active ? "var(--widget-active-background)" : "var(--widget-background)",
        border: "1px solid var(--widget-border)",
        borderRadius: "var(--widget-radius)",
        boxShadow: "var(--widget-shadow)",
        color: "var(--deck-text)",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--spacing-sm)",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {label}
    </button>
  );
}
