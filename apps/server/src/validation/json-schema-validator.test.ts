import { describe, expect, it } from "vitest";
import { validateAgainstSchema } from "./json-schema-validator.js";

describe("validateAgainstSchema", () => {
  const schema = {
    type: "object" as const,
    properties: { message: { type: "string" as const, minLength: 1 } },
    required: ["message"],
    additionalProperties: false,
  };

  it("accepts valid input", () => {
    expect(validateAgainstSchema(schema, { message: "hello" })).toEqual({ valid: true });
  });

  it("rejects missing required properties", () => {
    const result = validateAgainstSchema(schema, {});
    expect(result.valid).toBe(false);
  });

  it("rejects unexpected additional properties", () => {
    const result = validateAgainstSchema(schema, { message: "hi", extra: true });
    expect(result.valid).toBe(false);
  });
});
