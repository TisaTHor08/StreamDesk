import { useEffect, useRef, useState } from "react";
import type { InterfacePluginContext, WidgetRenderProps } from "@streamdesk/interface-sdk";
import { IconView } from "@streamdesk/ui-kit";

/**
 * Interface-side component of `windows-control`: custom widgets (sliders,
 * gauges, status cards) plus a preset that drops a fully wired "system
 * panel" onto a page in one go.
 *
 * V1 note: statically imported at Interface build time, like every other
 * plugin's interface component — see apps/interface/src/widgets/plugins.ts
 * and ARCHITECTURE.md's "Interface plugin components" deviation.
 */

const CATEGORY = "Windows — Système";
const THROTTLE_MS = 120;

const cardStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 6,
  padding: "var(--spacing-sm)",
  background: "var(--widget-background)",
  border: "1px solid var(--widget-border)",
  borderRadius: "var(--widget-radius)",
  boxShadow: "var(--widget-shadow)",
  color: "var(--deck-text)",
  overflow: "hidden",
};

/* ---------------------------------- Sliders ---------------------------------- */

function SliderWidget({ properties, boundValues, onInteract }: WidgetRenderProps) {
  const label = typeof properties.label === "string" ? properties.label : "";
  const remoteValue = typeof boundValues.value === "number" ? boundValues.value : 0;

  const [dragging, setDragging] = useState(false);
  const [localValue, setLocalValue] = useState(remoteValue);
  const lastSentAt = useRef(0);
  const pendingTimer = useRef<number>();

  useEffect(() => {
    if (!dragging) setLocalValue(remoteValue);
  }, [remoteValue, dragging]);

  function send(value: number) {
    onInteract?.("change", { level: value });
  }

  function handleInput(value: number) {
    setLocalValue(value);
    const now = Date.now();
    if (now - lastSentAt.current >= THROTTLE_MS) {
      lastSentAt.current = now;
      send(value);
    } else {
      window.clearTimeout(pendingTimer.current);
      pendingTimer.current = window.setTimeout(() => {
        lastSentAt.current = Date.now();
        send(value);
      }, THROTTLE_MS);
    }
  }

  function handleCommit(value: number) {
    window.clearTimeout(pendingTimer.current);
    lastSentAt.current = Date.now();
    send(value);
    setDragging(false);
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <IconView icon={properties.icon} size={16} />
          {label}
        </span>
        <span style={{ color: "var(--deck-muted-text)" }}>{Math.round(localValue)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={localValue}
        onPointerDown={() => setDragging(true)}
        onInput={(e) => handleInput(Number((e.target as HTMLInputElement).value))}
        onPointerUp={(e) => handleCommit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => handleCommit(Number((e.target as HTMLInputElement).value))}
        style={{ width: "100%", accentColor: "var(--deck-accent)", touchAction: "none" }}
      />
    </div>
  );
}

/* ----------------------------------- Gauges ----------------------------------- */

const RING_RADIUS = 15.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function PercentGauge({ properties, boundValues, fallbackLabel, color }: WidgetRenderProps & { fallbackLabel: string; color: string }) {
  const label = typeof properties.label === "string" && properties.label ? properties.label : fallbackLabel;
  const raw = boundValues.value;
  const value = typeof raw === "number" ? Math.max(0, Math.min(100, raw)) : null;
  const dash = ((value ?? 0) / 100) * RING_CIRCUMFERENCE;

  return (
    <div style={{ ...cardStyle, alignItems: "center" }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke="var(--widget-border)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {value === null ? "—" : `${Math.round(value)}%`}
        </div>
      </div>
      <span style={{ fontSize: 11, color: "var(--deck-muted-text)" }}>{label}</span>
    </div>
  );
}

/* ------------------------------ Fenêtre / Wi-Fi ------------------------------- */

function ActiveWindowWidget({ boundValues }: WidgetRenderProps) {
  const processName = typeof boundValues.processName === "string" ? boundValues.processName : null;
  const title = typeof boundValues.title === "string" ? boundValues.title : null;
  return (
    <div style={cardStyle}>
      <span style={{ fontSize: 10, color: "var(--deck-muted-text)" }}>Application active</span>
      <span
        style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {processName ?? "—"}
      </span>
      <span
        style={{ fontSize: 11, color: "var(--deck-muted-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {title ?? ""}
      </span>
    </div>
  );
}

function WifiStatusWidget({ boundValues }: WidgetRenderProps) {
  const enabled = boundValues.enabled === true;
  const connected = boundValues.connected === true;
  const ssid = typeof boundValues.ssid === "string" ? boundValues.ssid : null;
  const dotColor = !enabled ? "var(--deck-danger)" : connected ? "var(--deck-success, #2ecc71)" : "var(--deck-muted-text)";
  const statusText = !enabled ? "Wi-Fi désactivé" : connected ? (ssid ?? "Connecté") : "Non connecté";

  return (
    <div style={{ ...cardStyle, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Wi-Fi</span>
      </div>
      <span style={{ fontSize: 11, color: "var(--deck-muted-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {statusText}
      </span>
    </div>
  );
}

/* ------------------------------------ Setup ------------------------------------ */

export function activate(context: InterfacePluginContext): void {
  context.widgets.register({
    type: "windows.volumeSlider",
    pluginId: "windows-control",
    displayName: "Volume (curseur)",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: { label: { type: "string" }, icon: { type: "object", format: "icon" } } },
    defaultSize: { columnSpan: 2, rowSpan: 1 },
    interactionMode: "continuous",
    component: (props) => <SliderWidget {...props} />,
  });

  context.widgets.register({
    type: "windows.micVolumeSlider",
    pluginId: "windows-control",
    displayName: "Volume micro (curseur)",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: { label: { type: "string" }, icon: { type: "object", format: "icon" } } },
    defaultSize: { columnSpan: 2, rowSpan: 1 },
    interactionMode: "continuous",
    component: (props) => <SliderWidget {...props} />,
  });

  context.widgets.register({
    type: "windows.brightnessSlider",
    pluginId: "windows-control",
    displayName: "Luminosité (curseur)",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: { label: { type: "string" }, icon: { type: "object", format: "icon" } } },
    defaultSize: { columnSpan: 2, rowSpan: 1 },
    interactionMode: "continuous",
    component: (props) => <SliderWidget {...props} />,
  });

  context.widgets.register({
    type: "windows.cpuGauge",
    pluginId: "windows-control",
    displayName: "Jauge CPU",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: { label: { type: "string" } } },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: (props) => <PercentGauge {...props} fallbackLabel="CPU" color="var(--deck-accent)" />,
  });

  context.widgets.register({
    type: "windows.gpuGauge",
    pluginId: "windows-control",
    displayName: "Jauge GPU",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: { label: { type: "string" } } },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: (props) => <PercentGauge {...props} fallbackLabel="GPU" color="#a855f7" />,
  });

  context.widgets.register({
    type: "windows.ramGauge",
    pluginId: "windows-control",
    displayName: "Jauge RAM",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: { label: { type: "string" } } },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: (props) => <PercentGauge {...props} fallbackLabel="RAM" color="#22c55e" />,
  });

  context.widgets.register({
    type: "windows.diskGauge",
    pluginId: "windows-control",
    displayName: "Jauge disque",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: { label: { type: "string" } } },
    defaultSize: { columnSpan: 1, rowSpan: 1 },
    component: (props) => <PercentGauge {...props} fallbackLabel="Disque" color="#f59e0b" />,
  });

  context.widgets.register({
    type: "windows.activeWindowLabel",
    pluginId: "windows-control",
    displayName: "Application active",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: {} },
    defaultSize: { columnSpan: 2, rowSpan: 1 },
    component: ActiveWindowWidget,
  });

  context.widgets.register({
    type: "windows.wifiStatus",
    pluginId: "windows-control",
    displayName: "Statut Wi-Fi",
    description: "Affiche l'état du Wi-Fi. Ajoutez une interaction \"press\" -> \"windows.wifi.toggle\" pour en faire un bouton.",
    category: CATEGORY,
    propertiesSchema: { type: "object", properties: {} },
    defaultSize: { columnSpan: 2, rowSpan: 1 },
    component: WifiStatusWidget,
  });

  context.presets.register({
    id: "windows.systemPanel",
    pluginId: "windows-control",
    displayName: "Panneau système Windows",
    description: "Fenêtre active, volume, luminosité, Wi-Fi et jauges CPU/GPU/RAM/disque — déjà branchés.",
    category: CATEGORY,
    widgets: [
      {
        widgetType: "windows.activeWindowLabel",
        properties: {},
        defaultSize: { columnSpan: 2, rowSpan: 1 },
        offset: { column: 0, row: 0 },
        bindings: [
          { property: "processName", dataSourceId: "windows.activeWindow.processName" },
          { property: "title", dataSourceId: "windows.activeWindow.title" },
        ],
      },
      {
        widgetType: "windows.volumeSlider",
        properties: { label: "Volume", icon: { source: "iconify", id: "mdi:volume-high" } },
        defaultSize: { columnSpan: 2, rowSpan: 1 },
        offset: { column: 0, row: 1 },
        bindings: [{ property: "value", dataSourceId: "windows.audio.volume" }],
        interactions: [
          {
            trigger: "change",
            blocks: [
              {
                id: "windows-preset-volume-set",
                kind: "action",
                actionId: "windows.volume.set",
                input: { level: { kind: "triggerInput", field: "level" } },
              },
            ],
          },
        ],
      },
      {
        widgetType: "windows.brightnessSlider",
        properties: { label: "Luminosité", icon: { source: "iconify", id: "mdi:brightness-6" } },
        defaultSize: { columnSpan: 2, rowSpan: 1 },
        offset: { column: 0, row: 2 },
        bindings: [{ property: "value", dataSourceId: "windows.brightness" }],
        interactions: [
          {
            trigger: "change",
            blocks: [
              {
                id: "windows-preset-brightness-set",
                kind: "action",
                actionId: "windows.brightness.set",
                input: { level: { kind: "triggerInput", field: "level" } },
              },
            ],
          },
        ],
      },
      {
        widgetType: "windows.wifiStatus",
        properties: {},
        defaultSize: { columnSpan: 2, rowSpan: 1 },
        offset: { column: 0, row: 3 },
        bindings: [
          { property: "enabled", dataSourceId: "windows.wifi.enabled" },
          { property: "connected", dataSourceId: "windows.wifi.connected" },
          { property: "ssid", dataSourceId: "windows.wifi.ssid" },
        ],
        interactions: [
          {
            trigger: "press",
            blocks: [{ id: "windows-preset-wifi-toggle", kind: "action", actionId: "windows.wifi.toggle", input: {} }],
          },
        ],
      },
      {
        widgetType: "windows.cpuGauge",
        properties: {},
        defaultSize: { columnSpan: 1, rowSpan: 1 },
        offset: { column: 0, row: 4 },
        bindings: [{ property: "value", dataSourceId: "windows.system.cpuUsage" }],
      },
      {
        widgetType: "windows.gpuGauge",
        properties: {},
        defaultSize: { columnSpan: 1, rowSpan: 1 },
        offset: { column: 1, row: 4 },
        bindings: [{ property: "value", dataSourceId: "windows.system.gpuUsage" }],
      },
      {
        widgetType: "windows.ramGauge",
        properties: {},
        defaultSize: { columnSpan: 1, rowSpan: 1 },
        offset: { column: 0, row: 5 },
        bindings: [{ property: "value", dataSourceId: "windows.system.ramUsage" }],
      },
      {
        widgetType: "windows.diskGauge",
        properties: {},
        defaultSize: { columnSpan: 1, rowSpan: 1 },
        offset: { column: 1, row: 5 },
        bindings: [{ property: "value", dataSourceId: "windows.system.diskUsage" }],
      },
    ],
  });
}

export default { activate };
