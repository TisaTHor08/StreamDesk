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
  /**
   * Optional per-interaction override merged over the widget's persisted,
   * static `interaction.input` before the action executes (override wins on
   * key conflicts). Exists so a continuous-value widget (a volume/brightness
   * slider, for instance) can report its live value without the Interface
   * ever deciding *what action* to call or *why* — it only ever supplies a
   * value; the Server still owns the actionId/target/routing entirely, so
   * this does not weaken the "Interface has no business logic" rule.
   */
  inputOverride?: Record<string, unknown>;
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
