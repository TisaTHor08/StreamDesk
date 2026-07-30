import type {
  ActionExecutionRequest,
  ActionExecutionResult,
  CapabilityDescriptor,
  ConnectRegistration,
  DataSourceQuality,
  DeckPage,
  InterfaceRegistration,
  WidgetInteractionTrigger,
} from "@streamdesk/shared-types";
import type { ProtocolErrorPayload } from "./protocol-error.js";

/* ---------- Interface -> Server ---------- */

export type InterfaceRegisterPayload = InterfaceRegistration;

export type InterfaceViewportUpdatePayload = {
  viewport: InterfaceRegistration["viewport"];
};

export type InterfacePageRequestPayload = {
  pageId?: string;
  slug?: string;
};

export type InterfaceWidgetInteractPayload = {
  pageId: string;
  widgetId: string;
  trigger: WidgetInteractionTrigger;
};

export type InterfaceHeartbeatPayload = Record<string, never>;

/* ---------- Server -> Interface ---------- */

export type ServerInterfaceAcceptedPayload = {
  interfaceId: string;
  token: string;
  serverTime: string;
};

export type ServerPageSnapshotPayload = {
  page: DeckPage;
};

export type ServerWidgetStateUpdatePayload = {
  pageId: string;
  widgetId: string;
  property: string;
  dataSourceId?: string;
  value: unknown;
  quality: DataSourceQuality;
  updatedAt: string;
};

export type ServerNotificationPayload = {
  level: "info" | "warn" | "error";
  message: string;
};

export type ServerHeartbeatPayload = {
  serverTime: string;
};

/* ---------- Connect -> Server ---------- */

export type ConnectRegisterPayload = ConnectRegistration;

export type ConnectCapabilitiesUpdatePayload = {
  capabilities: CapabilityDescriptor[];
};

export type ConnectActionResultPayload = ActionExecutionResult;

export type ConnectEventPublishPayload = {
  eventType: string;
  payload: unknown;
};

export type ConnectDataSourceUpdatePayload = {
  dataSourceId: string;
  value: unknown;
};

export type ConnectHealthUpdatePayload = {
  uptimeSeconds: number;
  status: "online";
  loadedPlugins: string[];
};

export type ConnectHeartbeatPayload = Record<string, never>;

/* ---------- Server -> Connect ---------- */

export type ServerConnectAcceptedPayload = {
  connectId: string;
  token: string;
  serverTime: string;
};

export type ServerActionExecutePayload = ActionExecutionRequest;

export type ServerDataSourceSubscribePayload = {
  dataSourceIds: string[];
};

export type ServerPluginConfigurationUpdatePayload = {
  pluginId: string;
  settings: Record<string, unknown>;
};

export type ServerErrorPayload = ProtocolErrorPayload;
