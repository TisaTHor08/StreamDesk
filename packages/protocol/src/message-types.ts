/** Interface -> Server */
export const INTERFACE_TO_SERVER = {
  REGISTER: "interface.register",
  VIEWPORT_UPDATE: "interface.viewport.update",
  PAGE_REQUEST: "interface.page.request",
  WIDGET_INTERACT: "interface.widget.interact",
  HEARTBEAT: "interface.heartbeat",
} as const;

/** Server -> Interface */
export const SERVER_TO_INTERFACE = {
  INTERFACE_ACCEPTED: "server.interface.accepted",
  PAGE_SNAPSHOT: "server.page.snapshot",
  WIDGET_STATE_UPDATE: "server.widget.state.update",
  NOTIFICATION: "server.notification",
  ERROR: "server.error",
  HEARTBEAT: "server.heartbeat",
} as const;

/** Connect -> Server */
export const CONNECT_TO_SERVER = {
  REGISTER: "connect.register",
  CAPABILITIES_UPDATE: "connect.capabilities.update",
  ACTION_RESULT: "connect.action.result",
  EVENT_PUBLISH: "connect.event.publish",
  DATASOURCE_UPDATE: "connect.datasource.update",
  HEALTH_UPDATE: "connect.health.update",
  HEARTBEAT: "connect.heartbeat",
} as const;

/** Server -> Connect */
export const SERVER_TO_CONNECT = {
  CONNECT_ACCEPTED: "server.connect.accepted",
  ACTION_EXECUTE: "server.action.execute",
  DATASOURCE_SUBSCRIBE: "server.datasource.subscribe",
  PLUGIN_CONFIGURATION_UPDATE: "server.plugin.configuration.update",
  ERROR: "server.error",
  HEARTBEAT: "server.heartbeat",
} as const;

/**
 * Flat registry of every message type string, with fully-qualified key
 * names so that names never collide even though several roles share a
 * short name like HEARTBEAT or REGISTER (interface.register vs
 * connect.register are different messages with different payloads).
 */
export const MESSAGE_TYPES = {
  INTERFACE_REGISTER: INTERFACE_TO_SERVER.REGISTER,
  INTERFACE_VIEWPORT_UPDATE: INTERFACE_TO_SERVER.VIEWPORT_UPDATE,
  INTERFACE_PAGE_REQUEST: INTERFACE_TO_SERVER.PAGE_REQUEST,
  INTERFACE_WIDGET_INTERACT: INTERFACE_TO_SERVER.WIDGET_INTERACT,
  INTERFACE_HEARTBEAT: INTERFACE_TO_SERVER.HEARTBEAT,

  SERVER_INTERFACE_ACCEPTED: SERVER_TO_INTERFACE.INTERFACE_ACCEPTED,
  SERVER_PAGE_SNAPSHOT: SERVER_TO_INTERFACE.PAGE_SNAPSHOT,
  SERVER_WIDGET_STATE_UPDATE: SERVER_TO_INTERFACE.WIDGET_STATE_UPDATE,
  SERVER_NOTIFICATION: SERVER_TO_INTERFACE.NOTIFICATION,

  CONNECT_REGISTER: CONNECT_TO_SERVER.REGISTER,
  CONNECT_CAPABILITIES_UPDATE: CONNECT_TO_SERVER.CAPABILITIES_UPDATE,
  CONNECT_ACTION_RESULT: CONNECT_TO_SERVER.ACTION_RESULT,
  CONNECT_EVENT_PUBLISH: CONNECT_TO_SERVER.EVENT_PUBLISH,
  CONNECT_DATASOURCE_UPDATE: CONNECT_TO_SERVER.DATASOURCE_UPDATE,
  CONNECT_HEALTH_UPDATE: CONNECT_TO_SERVER.HEALTH_UPDATE,
  CONNECT_HEARTBEAT: CONNECT_TO_SERVER.HEARTBEAT,

  SERVER_CONNECT_ACCEPTED: SERVER_TO_CONNECT.CONNECT_ACCEPTED,
  SERVER_ACTION_EXECUTE: SERVER_TO_CONNECT.ACTION_EXECUTE,
  SERVER_DATASOURCE_SUBSCRIBE: SERVER_TO_CONNECT.DATASOURCE_SUBSCRIBE,
  SERVER_PLUGIN_CONFIGURATION_UPDATE: SERVER_TO_CONNECT.PLUGIN_CONFIGURATION_UPDATE,

  // Shared across both server->interface and server->connect directions.
  SERVER_ERROR: SERVER_TO_INTERFACE.ERROR,
  SERVER_HEARTBEAT: SERVER_TO_INTERFACE.HEARTBEAT,
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
