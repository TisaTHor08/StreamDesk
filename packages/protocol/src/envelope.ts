export const PROTOCOL_VERSION = "1";

export type ProtocolRole = "interface" | "server" | "connect";

export type ProtocolEnvelope<TPayload = unknown> = {
  protocolVersion: string;
  messageId: string;
  type: string;
  timestamp: string;
  source: {
    role: ProtocolRole;
    instanceId: string;
  };
  correlationId?: string;
  payload: TPayload;
};

export type CreateEnvelopeInput<TPayload> = {
  type: string;
  source: { role: ProtocolRole; instanceId: string };
  payload: TPayload;
  correlationId?: string;
  messageId?: string;
  timestamp?: string;
};

/**
 * Builds a protocol envelope with sane defaults (version, id, timestamp).
 * Every message sent over the wire — in any direction — must go through
 * this helper so the envelope shape never drifts.
 */
export function createEnvelope<TPayload>(
  input: CreateEnvelopeInput<TPayload>,
): ProtocolEnvelope<TPayload> {
  return {
    protocolVersion: PROTOCOL_VERSION,
    messageId: input.messageId ?? crypto.randomUUID(),
    type: input.type,
    timestamp: input.timestamp ?? new Date().toISOString(),
    source: input.source,
    correlationId: input.correlationId,
    payload: input.payload,
  };
}
