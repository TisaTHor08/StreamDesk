import { useState } from "react";
import type { WidgetRenderProps } from "@streamdesk/interface-sdk";
import { IconView } from "@streamdesk/ui-kit";

/**
 * A two-state (on/off) widget in two visual flavors, chosen via the
 * `style` property: "button" (whole cell recolors between an active and a
 * passive style, like ButtonWidget but stateful) or "switch" (a compact
 * iOS-style pill toggle alongside the label).
 *
 * Registered with `interactionMode: "continuous"` — like windows-control's
 * sliders — so this component owns its own tap handling and can report a
 * live value via `onInteract("change", { active })` instead of the
 * DeckGrid wrapper's single press/release dispatch. Whether that value
 * persists anywhere is entirely up to the operator's interaction script;
 * this widget only ever reports what the operator just tapped.
 *
 * Visual state: if the widget has a binding on the "active" property (see
 * WidgetInspector's "Données liées"), the bound value is the source of
 * truth — e.g. reflecting a real "is muted" data source — and tapping
 * still reports the new value but doesn't get ahead of the Server's own
 * confirmation. Without a binding, the widget just tracks its own tap
 * state locally, which is enough for a purely presentational toggle.
 */
export function ToggleWidget({ properties, boundValues, onInteract, disabled }: WidgetRenderProps) {
  const label = typeof properties.label === "string" ? properties.label : "";
  const style = properties.style === "switch" ? "switch" : "button";
  const isBound = typeof boundValues.active === "boolean";
  const [localActive, setLocalActive] = useState(false);
  const active = isBound ? Boolean(boundValues.active) : localActive;

  function toggle() {
    if (disabled) return;
    const next = !active;
    if (!isBound) setLocalActive(next);
    onInteract?.("change", { active: next });
  }

  if (style === "switch") {
    return (
      <div
        onClick={toggle}
        role="switch"
        aria-checked={active}
        aria-disabled={disabled || undefined}
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "var(--spacing-sm) var(--spacing-md)",
          background: "var(--widget-background)",
          border: "1px solid var(--widget-border)",
          borderRadius: "var(--widget-radius)",
          boxShadow: "var(--widget-shadow)",
          color: "var(--deck-text)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          userSelect: "none",
          touchAction: "manipulation",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <IconView icon={properties.icon} size={20} />
          {label && <span>{label}</span>}
        </span>
        <span
          style={{
            flexShrink: 0,
            width: 42,
            height: 24,
            borderRadius: 999,
            background: active ? "var(--deck-accent)" : "var(--deck-background)",
            border: "1px solid var(--widget-border)",
            position: "relative",
            transition: "background 0.15s ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: active ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
              transition: "left 0.15s ease",
            }}
          />
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={toggle}
      className="sd-widget sd-widget--toggle"
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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "var(--spacing-sm)",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      <IconView icon={properties.icon} size={24} />
      {label && <span>{label}</span>}
    </button>
  );
}
