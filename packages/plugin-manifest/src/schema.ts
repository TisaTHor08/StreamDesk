import { z } from "zod";
import { PLUGIN_PERMISSIONS } from "@streamdesk/shared-types";

const platformSchema = z.enum(["windows", "linux", "macos"]);
const architectureSchema = z.enum(["x64", "arm64"]);

const componentEntrySchema = z.object({
  entrypoint: z.string().min(1),
});

const connectComponentEntrySchema = componentEntrySchema.extend({
  platforms: z.array(platformSchema).optional(),
  architectures: z.array(architectureSchema).optional(),
});

const pluginIdSchema = z
  .string()
  .min(3)
  .max(128)
  .regex(
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
    "Plugin id must be a lowercase, dot/dash/underscore-separated namespace (e.g. 'community.example')",
  );

export const pluginManifestSchema = z.object({
  id: pluginIdSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  apiVersion: z.string().min(1),
  license: z.string().min(1),
  description: z.string().optional(),
  author: z.object({
    name: z.string().min(1),
    url: z.string().url().optional(),
    email: z.string().email().optional(),
  }),
  components: z.object({
    server: componentEntrySchema.optional(),
    connect: connectComponentEntrySchema.optional(),
    interface: componentEntrySchema.optional(),
  }),
  contributes: z.object({
    actions: z.array(z.string()).optional(),
    events: z.array(z.string()).optional(),
    dataSources: z.array(z.string()).optional(),
    widgets: z.array(z.string()).optional(),
    presets: z.array(z.string()).optional(),
    themes: z.array(z.string()).optional(),
  }),
  permissions: z.array(z.string()),
});

export type PluginManifestParseResult =
  | { ok: true; manifest: z.infer<typeof pluginManifestSchema> }
  | { ok: false; errors: string[] };

export function parsePluginManifest(raw: unknown): PluginManifestParseResult {
  const result = pluginManifestSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => issue.message) };
  }

  const unknownPermissions = result.data.permissions.filter(
    (permission) => !(PLUGIN_PERMISSIONS as readonly string[]).includes(permission),
  );
  if (unknownPermissions.length > 0) {
    return {
      ok: false,
      errors: unknownPermissions.map((permission) => `Unknown permission: "${permission}"`),
    };
  }

  if (
    !result.data.components.server &&
    !result.data.components.connect &&
    !result.data.components.interface
  ) {
    return {
      ok: false,
      errors: ["Manifest must declare at least one of components.server / connect / interface"],
    };
  }

  return { ok: true, manifest: result.data };
}
