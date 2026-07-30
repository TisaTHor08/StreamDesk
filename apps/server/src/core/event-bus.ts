import { randomUUID } from "node:crypto";
import type { PublishedEvent } from "@streamdesk/shared-types";
import type { EventRegistry } from "../registries/event-registry.js";
import type { EventsRepository } from "../db/repositories/events.repo.js";
import type { Logger } from "../logging/logger.js";
import { validateAgainstSchema } from "../validation/json-schema-validator.js";

export type EventHandler = (event: PublishedEvent) => void | Promise<void>;

/**
 * Server-side event bus. Connect publishes events (`connect.event.publish`)
 * which land here; Server-side plugins can also publish directly via the
 * Server SDK. Every event is validated against its registered schema,
 * persisted to a bounded log, and fanned out to in-process subscribers.
 */
export class EventBus {
  private readonly subscribers = new Map<string, Set<EventHandler>>();

  constructor(
    private readonly registry: EventRegistry,
    private readonly repo: EventsRepository,
    private readonly logger: Logger,
  ) {}

  publish(input: Omit<PublishedEvent, "eventId" | "timestamp">): PublishedEvent {
    const definition = this.registry.get(input.eventType);
    if (!definition) {
      throw new Error(`Cannot publish unknown event type "${input.eventType}"`);
    }

    const validation = validateAgainstSchema(definition.payloadSchema, input.payload);
    if (!validation.valid) {
      throw new Error(`Event payload for "${input.eventType}" failed validation: ${validation.errors.join("; ")}`);
    }

    const event: PublishedEvent = {
      ...input,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.repo.record(event);

    const handlers = this.subscribers.get(event.eventType);
    if (handlers) {
      for (const handler of handlers) {
        Promise.resolve(handler(event)).catch((error) =>
          this.logger.error("Event subscriber threw", { eventType: event.eventType, error: String(error) }),
        );
      }
    }

    return event;
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, new Set());
    this.subscribers.get(eventType)!.add(handler);
    return () => this.subscribers.get(eventType)?.delete(handler);
  }
}
