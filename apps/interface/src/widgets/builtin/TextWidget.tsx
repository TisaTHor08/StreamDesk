import type { WidgetRenderProps } from "@streamdesk/interface-sdk";

export function TextWidget({ properties, boundValues }: WidgetRenderProps) {
  const label = typeof properties.label === "string" ? properties.label : undefined;
  const format = typeof properties.format === "string" ? properties.format : "{value}";
  const value = boundValues.value;
  const rendered = value === undefined || value === null ? "—" : format.replace("{value}", String(value));

  return (
    <div
      className="sd-widget sd-widget--text"
      data-label={label}
      data-value={rendered}
      style={{
        background: "var(--widget-background)",
        border: "1px solid var(--widget-border)",
        borderRadius: "var(--widget-radius)",
        boxShadow: "var(--widget-shadow)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "var(--spacing-sm)",
      }}
    >
      {label && <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>{label}</span>}
      <span style={{ fontSize: 20, fontWeight: 700, color: "var(--deck-text)" }}>{rendered}</span>
    </div>
  );
}
