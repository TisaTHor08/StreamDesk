import type { JsonSchema } from "./json-schema.js";

/** Static definition of an event type, registered by a plugin. */
export type EventDefinition = {
  id: string;
  pluginId: string;
  payloadSchema: JsonSchema;
};

/** A concrete event instance flowing through the Server's event bus. */
export type PublishedEvent = {
  eventId: string;
  eventType: string;
  sourcePluginId: string;
  sourceConnectId?: string;
  timestamp: string;
  payload: unknown;
};
