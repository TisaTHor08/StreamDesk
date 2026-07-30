import { useRef, type CSSProperties } from "react";
import type { DeckPage, WidgetInstance, WidgetInteractionTrigger } from "@streamdesk/shared-types";
import { widgetRegistry } from "../widgets/registry.js";
import { useConnection } from "../state/ConnectionProvider.js";

const LONG_PRESS_MS = 550;

/**
 * Owns all pointer/press dispatch for a widget cell so there is exactly
 * one code path that turns a touch into an interaction. Widget components
 * (ButtonWidget, NavigationWidget, ...) are purely presentational — they
 * never attach their own pointer handlers — which avoids double-firing
 * between a component's own click handler and this wrapper's long-press
 * timer.
 */
function WidgetCell({ widget }: { widget: WidgetInstance }) {
  const { boundValues, interact, requestPage } = useConnection();
  const definition = widgetRegistry.get(widget.widgetType);
  const isNavigation = widget.widgetType === "core.navigation";
  const isContinuous = definition?.interactionMode === "continuous";
  const longPressFired = useRef(false);
  const longPressTimer = useRef<number>();

  const style: CSSProperties = {
    gridColumn: `${widget.position.column + 1} / span ${widget.position.columnSpan}`,
    gridRow: `${widget.position.row + 1} / span ${widget.position.rowSpan}`,
  };

  if (!definition) {
    return (
      <div style={{ ...style, color: "var(--deck-danger)", fontSize: 12, padding: 8 }}>
        Widget inconnu : {widget.widgetType}
      </div>
    );
  }

  const hasInteraction = (trigger: string) => widget.interactions?.some((i) => i.trigger === trigger);

  // Navigation is handled entirely client-side: it changes which page is
  // displayed, it is not a server action (see spec section 4.2).
  const firePress = () => {
    if (isNavigation) {
      const slug = widget.properties.targetSlug;
      if (typeof slug === "string") requestPage({ slug });
      return;
    }
    if (hasInteraction("press")) interact(widget.id, "press");
  };

  const fireLongPress = () => {
    if (!isNavigation && hasInteraction("longPress")) interact(widget.id, "longPress");
  };

  const fireRelease = () => {
    if (hasInteraction("release")) interact(widget.id, "release");
  };

  // Exposed to the widget component itself (not just the DeckGrid wrapper's
  // own pointer handlers) so continuous-value widgets — a volume slider,
  // for instance — can fire an interaction with a live value on their own
  // schedule, instead of only in response to a single press/release.
  const fireInteract = (trigger: WidgetInteractionTrigger, inputOverride?: Record<string, unknown>) => {
    if (!hasInteraction(trigger)) return;
    interact(widget.id, trigger, inputOverride);
  };

  const handlePointerDown = () => {
    longPressFired.current = false;
    if (!isNavigation && hasInteraction("longPress")) {
      longPressTimer.current = window.setTimeout(() => {
        longPressFired.current = true;
        fireLongPress();
      }, LONG_PRESS_MS);
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    fireRelease();
  };

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    firePress();
  };

  const Component = definition.component;

  return (
    <div
      style={style}
      onPointerDown={isContinuous ? undefined : handlePointerDown}
      onPointerUp={isContinuous ? undefined : handlePointerUp}
      onClick={isContinuous ? undefined : handleClick}
    >
      <Component
        widgetId={widget.id}
        properties={widget.properties}
        boundValues={boundValues[widget.id] ?? {}}
        active={false}
        onPress={firePress}
        onRelease={fireRelease}
        onLongPress={fireLongPress}
        onInteract={fireInteract}
      />
    </div>
  );
}

export function DeckGrid({ page }: { page: DeckPage }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${page.grid.columns}, minmax(0, 1fr))`,
        gridAutoRows: `${page.grid.rowHeight}px`,
        gap: page.grid.gap,
        padding: "var(--spacing-md)",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {page.widgets.map((widget) => (
        <WidgetCell key={widget.id} widget={widget} />
      ))}
    </div>
  );
}
