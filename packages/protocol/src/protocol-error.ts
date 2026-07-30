export type ProtocolErrorCode =
  | "VALIDATION_FAILED"
  | "UNKNOWN_MESSAGE_TYPE"
  | "UNSUPPORTED_PROTOCOL_VERSION"
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export type ProtocolErrorPayload = {
  code: ProtocolErrorCode;
  message: string;
  details?: unknown;
  /** messageId of the envelope that triggered this error, when applicable. */
  inResponseTo?: string;
};

export class ProtocolError extends Error {
  readonly code: ProtocolErrorCode;
  readonly details?: unknown;

  constructor(code: ProtocolErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ProtocolError";
    this.code = code;
    this.details = details;
  }

  toPayload(inResponseTo?: string): ProtocolErrorPayload {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      inResponseTo,
    };
  }
}
