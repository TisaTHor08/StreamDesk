import Ajv2020 from "ajv/dist/2020.js";
import type { JsonSchema } from "@streamdesk/shared-types";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const compiledCache = new WeakMap<object, ReturnType<typeof ajv.compile>>();

export type ValidationOutcome = { valid: true } | { valid: false; errors: string[] };

/**
 * Validates arbitrary input against a plugin-declared JSON Schema
 * (ActionDefinition.inputSchema, DataSourceDefinition.valueSchema, etc.).
 * Compiled validators are cached per schema object identity.
 */
export function validateAgainstSchema(schema: JsonSchema, data: unknown): ValidationOutcome {
  let validate = compiledCache.get(schema as object);
  if (!validate) {
    validate = ajv.compile(schema as object);
    compiledCache.set(schema as object, validate);
  }
  const valid = validate(data);
  if (valid) return { valid: true };
  return {
    valid: false,
    errors: (validate.errors ?? []).map((err) => `${err.instancePath || "/"} ${err.message ?? "invalid"}`),
  };
}
