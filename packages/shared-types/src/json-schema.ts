/**
 * Minimal structural JSON Schema type.
 *
 * We deliberately avoid pulling in a full JSON Schema type package for V1.
 * This type is intentionally loose (it mirrors the subset of JSON Schema
 * Draft 2020-12 that the platform actually validates against) while still
 * giving contributors autocomplete for the common keywords.
 */
export type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: Array<string | number | boolean | null>;
  const?: string | number | boolean | null;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: unknown;
  description?: string;
  additionalProperties?: boolean | JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  $ref?: string;
};
