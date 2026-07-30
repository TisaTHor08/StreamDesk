import { z } from "zod";
import { envelopeSchema, getPayloadSchema, isSupportedProtocolVersion } from "./schemas.js";
import type { ProtocolEnvelope } from "./envelope.js";
import { ProtocolError } from "./protocol-error.js";

/**
 * Validates a raw, untrusted message (already JSON.parsed) into a typed,
 * trustworthy ProtocolEnvelope. Throws a ProtocolError with a structured
 * code on any failure. Every inbound WebSocket message MUST pass through
 * this function before its payload is used (Rule 7 of the architecture).
 */
export function parseEnvelope<TPayload = unknown>(
  raw: unknown,
): ProtocolEnvelope<TPayload> {
  const envelopeResult = envelopeSchema.safeParse(raw);
  if (!envelopeResult.success) {
    throw new ProtocolError(
      "VALIDATION_FAILED",
      "Message envelope failed validation",
      envelopeResult.error.flatten(),
    );
  }

  const envelope = envelopeResult.data;

  if (!isSupportedProtocolVersion(envelope.protocolVersion)) {
    throw new ProtocolError(
      "UNSUPPORTED_PROTOCOL_VERSION",
      `Unsupported protocol version "${envelope.protocolVersion}"`,
      { received: envelope.protocolVersion },
    );
  }

  const payloadSchema = getPayloadSchema(envelope.type);
  if (!payloadSchema) {
    throw new ProtocolError(
      "UNKNOWN_MESSAGE_TYPE",
      `Unknown message type "${envelope.type}"`,
      { type: envelope.type },
    );
  }

  const payloadResult = payloadSchema.safeParse(envelope.payload);
  if (!payloadResult.success) {
    throw new ProtocolError(
      "VALIDATION_FAILED",
      `Payload for message type "${envelope.type}" failed validation`,
      payloadResult.error.flatten(),
    );
  }

  return {
    ...envelope,
    payload: payloadResult.data as TPayload,
  } as ProtocolEnvelope<TPayload>;
}

/** Safe variant that never throws; returns a discriminated result instead. */
export function tryParseEnvelope<TPayload = unknown>(
  raw: unknown,
): { ok: true; envelope: ProtocolEnvelope<TPayload> } | { ok: false; error: ProtocolError } {
  try {
    return { ok: true, envelope: parseEnvelope<TPayload>(raw) };
  } catch (error) {
    if (error instanceof ProtocolError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new ProtocolError("INTERNAL_ERROR", "Unexpected error while parsing envelope", error),
    };
  }
}

export { z };
