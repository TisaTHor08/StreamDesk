import { z } from "zod";
import type { InteractionBlock, InteractionExpression } from "@streamdesk/shared-types";
import { MESSAGE_TYPES, type MessageType } from "./message-types.js";
import { PROTOCOL_VERSION } from "./envelope.js";

/* ---------- shared fragments ---------- */

const viewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  pixelRatio: z.number().positive(),
  orientation: z.enum(["portrait", "landscape"]),
});

const capabilityDescriptorSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  providerPluginId: z.string().min(1),
  actions: z.array(z.string()),
  events: z.array(z.string()),
  dataSources: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
});

const actionTargetSchema = z.object({
  mode: z.enum(["automatic", "specific"]),
  connectId: z.string().optional(),
});

const actionRequesterSchema = z.object({
  type: z.enum(["widget", "automation", "api", "system"]),
  id: z.string(),
});

const actionExecutionRequestSchema = z.object({
  executionId: z.string().min(1),
  actionId: z.string().min(1),
  input: z.unknown(),
  target: actionTargetSchema.optional(),
  requestedBy: actionRequesterSchema,
});

const actionExecutionResultSchema = z.object({
  executionId: z.string().min(1),
  status: z.enum(["success", "error", "timeout", "cancelled"]),
  output: z.unknown().optional(),
  error: z
    .object({
      code: z.enum([
        "ACTION_NOT_FOUND",
        "INVALID_ACTION_INPUT",
        "NO_COMPATIBLE_CONNECT",
        "CONNECT_OFFLINE",
        "ACTION_TIMEOUT",
        "ACTION_EXECUTION_FAILED",
        "PERMISSION_DENIED",
        "PLUGIN_DISABLED",
      ]),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
  startedAt: z.string(),
  completedAt: z.string(),
});

const gridPositionSchema = z.object({
  column: z.number().int().min(0),
  row: z.number().int().min(0),
  columnSpan: z.number().int().min(1),
  rowSpan: z.number().int().min(1),
});

const widgetBindingSchema = z.object({
  property: z.string(),
  dataSourceId: z.string(),
  transform: z
    .object({ type: z.string(), options: z.record(z.unknown()).optional() })
    .optional(),
});

/* ---------- interaction scripts (blocks + expressions) ----------
 * Both types are recursive (a comparison's operands are themselves
 * expressions; an "if" block's branches are themselves block sequences),
 * so their zod schemas are built with z.lazy() and typed explicitly —
 * zod can't infer a recursive schema's type on its own. */

const compareOpSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]);
const logicalOpSchema = z.enum(["and", "or", "not"]);
const arithmeticOpSchema = z.enum(["add", "sub", "mul", "div", "mod"]);

export const interactionExpressionSchema: z.ZodType<InteractionExpression> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal("literal"), value: z.union([z.string(), z.number(), z.boolean()]) }),
    z.object({ kind: z.literal("variable"), variableId: z.string().min(1) }),
    z.object({ kind: z.literal("dataSource"), dataSourceId: z.string().min(1) }),
    z.object({ kind: z.literal("triggerInput"), field: z.string().min(1) }),
    z.object({
      kind: z.literal("compare"),
      op: compareOpSchema,
      left: interactionExpressionSchema,
      right: interactionExpressionSchema,
    }),
    z.object({
      kind: z.literal("logical"),
      op: logicalOpSchema,
      operands: z.array(interactionExpressionSchema).min(1),
    }),
    z.object({
      kind: z.literal("arithmetic"),
      op: arithmeticOpSchema,
      left: interactionExpressionSchema,
      right: interactionExpressionSchema,
    }),
  ]),
);

export const interactionBlockSchema: z.ZodType<InteractionBlock> = z.lazy(() =>
  z.union([
    z.object({
      id: z.string().min(1),
      kind: z.literal("action"),
      actionId: z.string().min(1),
      input: z.record(interactionExpressionSchema),
      target: actionTargetSchema.optional(),
    }),
    z.object({
      id: z.string().min(1),
      kind: z.literal("if"),
      condition: interactionExpressionSchema,
      then: z.array(interactionBlockSchema),
      else: z.array(interactionBlockSchema).optional(),
    }),
    z.object({
      id: z.string().min(1),
      kind: z.literal("repeatCount"),
      count: interactionExpressionSchema,
      body: z.array(interactionBlockSchema),
    }),
    z.object({
      id: z.string().min(1),
      kind: z.literal("repeatWhile"),
      condition: interactionExpressionSchema,
      body: z.array(interactionBlockSchema),
    }),
    z.object({
      id: z.string().min(1),
      kind: z.literal("wait"),
      durationMs: interactionExpressionSchema,
    }),
    z.object({
      id: z.string().min(1),
      kind: z.literal("setVariable"),
      variableId: z.string().min(1),
      value: interactionExpressionSchema,
    }),
    z.object({
      id: z.string().min(1),
      kind: z.literal("changeVariable"),
      variableId: z.string().min(1),
      delta: interactionExpressionSchema,
    }),
  ]),
);

const widgetInteractionSchema = z.object({
  trigger: z.enum(["press", "release", "longPress", "change"]),
  blocks: z.array(interactionBlockSchema),
});

const widgetInstanceSchema = z.object({
  id: z.string(),
  widgetType: z.string(),
  pluginId: z.string(),
  position: gridPositionSchema,
  properties: z.record(z.unknown()),
  bindings: z.array(widgetBindingSchema).optional(),
  interactions: z.array(widgetInteractionSchema).optional(),
  style: z
    .object({
      background: z.string().optional(),
      activeBackground: z.string().optional(),
      textColor: z.string().optional(),
      borderRadius: z.string().optional(),
      icon: z.string().optional(),
    })
    .optional(),
});

const deckPageSchema = z.object({
  schemaVersion: z.string(),
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  grid: z.object({
    columns: z.number().int().positive(),
    rowHeight: z.number().positive(),
    gap: z.number().min(0),
  }),
  widgets: z.array(widgetInstanceSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const dataSourceQualitySchema = z.enum(["good", "stale", "unavailable"]);

const protocolErrorPayloadSchema = z.object({
  code: z.enum([
    "VALIDATION_FAILED",
    "UNKNOWN_MESSAGE_TYPE",
    "UNSUPPORTED_PROTOCOL_VERSION",
    "UNAUTHENTICATED",
    "UNAUTHORIZED",
    "INTERNAL_ERROR",
  ]),
  message: z.string(),
  details: z.unknown().optional(),
  inResponseTo: z.string().optional(),
});

/* ---------- Interface -> Server payload schemas ---------- */

export const interfaceRegisterSchema = z.object({
  interfaceId: z.string().min(1),
  name: z.string().min(1),
  userAgent: z.string(),
  viewport: viewportSchema,
  supportedFeatures: z.array(z.string()),
  token: z.string().optional(),
});

export const interfaceViewportUpdateSchema = z.object({
  viewport: viewportSchema,
});

export const interfacePageRequestSchema = z.object({
  pageId: z.string().optional(),
  slug: z.string().optional(),
});

export const interfaceWidgetInteractSchema = z.object({
  pageId: z.string().min(1),
  widgetId: z.string().min(1),
  trigger: z.enum(["press", "release", "longPress", "change"]),
  inputOverride: z.record(z.unknown()).optional(),
});

export const interfaceHeartbeatSchema = z.object({}).strict();

/* ---------- Server -> Interface payload schemas ---------- */

export const serverInterfaceAcceptedSchema = z.object({
  interfaceId: z.string(),
  token: z.string(),
  serverTime: z.string(),
});

export const serverPageSnapshotSchema = z.object({
  page: deckPageSchema,
});

export const serverWidgetStateUpdateSchema = z.object({
  pageId: z.string(),
  widgetId: z.string(),
  property: z.string(),
  dataSourceId: z.string().optional(),
  value: z.unknown(),
  quality: dataSourceQualitySchema,
  updatedAt: z.string(),
});

export const serverNotificationSchema = z.object({
  level: z.enum(["info", "warn", "error"]),
  message: z.string(),
});

export const serverHeartbeatSchema = z.object({
  serverTime: z.string(),
});

/* ---------- Connect -> Server payload schemas ---------- */

export const connectRegisterSchema = z.object({
  connectId: z.string().min(1),
  name: z.string().min(1),
  platform: z.enum(["windows", "linux", "macos"]),
  architecture: z.enum(["x64", "arm64"]),
  version: z.string(),
  capabilities: z.array(capabilityDescriptorSchema),
  token: z.string().optional(),
});

export const connectCapabilitiesUpdateSchema = z.object({
  capabilities: z.array(capabilityDescriptorSchema),
});

export const connectActionResultSchema = actionExecutionResultSchema;

export const connectEventPublishSchema = z.object({
  eventType: z.string().min(1),
  payload: z.unknown(),
});

export const connectDataSourceUpdateSchema = z.object({
  dataSourceId: z.string().min(1),
  value: z.unknown(),
});

export const connectHealthUpdateSchema = z.object({
  uptimeSeconds: z.number().min(0),
  status: z.literal("online"),
  loadedPlugins: z.array(z.string()),
});

export const connectHeartbeatSchema = z.object({}).strict();

/* ---------- Server -> Connect payload schemas ---------- */

export const serverConnectAcceptedSchema = z.object({
  connectId: z.string(),
  token: z.string(),
  serverTime: z.string(),
});

export const serverActionExecuteSchema = actionExecutionRequestSchema;

export const serverDataSourceSubscribeSchema = z.object({
  dataSourceIds: z.array(z.string()),
});

export const serverPluginConfigurationUpdateSchema = z.object({
  pluginId: z.string(),
  settings: z.record(z.unknown()),
});

export const serverErrorSchema = protocolErrorPayloadSchema;

/* ---------- envelope + registry ---------- */

export const envelopeSchema = z.object({
  protocolVersion: z.string(),
  messageId: z.string().min(1),
  type: z.string().min(1),
  timestamp: z.string(),
  source: z.object({
    role: z.enum(["interface", "server", "connect"]),
    instanceId: z.string().min(1),
  }),
  correlationId: z.string().optional(),
  payload: z.unknown(),
});

/**
 * Maps every known message `type` to its payload validator.
 * Every MESSAGE_TYPES value is namespaced by role (interface.* / server.* /
 * connect.*), so there are no key collisions despite some payload shapes
 * (e.g. the three heartbeats) being conceptually similar.
 */
export const PAYLOAD_SCHEMAS: Record<MessageType, z.ZodTypeAny> = {
  [MESSAGE_TYPES.INTERFACE_REGISTER]: interfaceRegisterSchema,
  [MESSAGE_TYPES.INTERFACE_VIEWPORT_UPDATE]: interfaceViewportUpdateSchema,
  [MESSAGE_TYPES.INTERFACE_PAGE_REQUEST]: interfacePageRequestSchema,
  [MESSAGE_TYPES.INTERFACE_WIDGET_INTERACT]: interfaceWidgetInteractSchema,
  [MESSAGE_TYPES.INTERFACE_HEARTBEAT]: interfaceHeartbeatSchema,
  [MESSAGE_TYPES.SERVER_INTERFACE_ACCEPTED]: serverInterfaceAcceptedSchema,
  [MESSAGE_TYPES.SERVER_PAGE_SNAPSHOT]: serverPageSnapshotSchema,
  [MESSAGE_TYPES.SERVER_WIDGET_STATE_UPDATE]: serverWidgetStateUpdateSchema,
  [MESSAGE_TYPES.SERVER_NOTIFICATION]: serverNotificationSchema,
  [MESSAGE_TYPES.CONNECT_REGISTER]: connectRegisterSchema,
  [MESSAGE_TYPES.CONNECT_CAPABILITIES_UPDATE]: connectCapabilitiesUpdateSchema,
  [MESSAGE_TYPES.CONNECT_ACTION_RESULT]: connectActionResultSchema,
  [MESSAGE_TYPES.CONNECT_EVENT_PUBLISH]: connectEventPublishSchema,
  [MESSAGE_TYPES.CONNECT_DATASOURCE_UPDATE]: connectDataSourceUpdateSchema,
  [MESSAGE_TYPES.CONNECT_HEALTH_UPDATE]: connectHealthUpdateSchema,
  [MESSAGE_TYPES.CONNECT_HEARTBEAT]: connectHeartbeatSchema,
  [MESSAGE_TYPES.SERVER_CONNECT_ACCEPTED]: serverConnectAcceptedSchema,
  [MESSAGE_TYPES.SERVER_ACTION_EXECUTE]: serverActionExecuteSchema,
  [MESSAGE_TYPES.SERVER_DATASOURCE_SUBSCRIBE]: serverDataSourceSubscribeSchema,
  [MESSAGE_TYPES.SERVER_PLUGIN_CONFIGURATION_UPDATE]: serverPluginConfigurationUpdateSchema,
  [MESSAGE_TYPES.SERVER_ERROR]: serverErrorSchema,
  [MESSAGE_TYPES.SERVER_HEARTBEAT]: serverHeartbeatSchema,
};

export function getPayloadSchema(type: string): z.ZodTypeAny | undefined {
  return PAYLOAD_SCHEMAS[type as MessageType];
}

export function isSupportedProtocolVersion(version: string): boolean {
  return version === PROTOCOL_VERSION;
}
