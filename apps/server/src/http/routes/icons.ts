import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import type { Runtime } from "../../core/runtime.js";

/** Uploaded icons are re-encoded under a fresh random name with a
 * allow-listed extension — never the client-supplied filename — so this
 * can never be used to write or read an arbitrary path on disk. */
const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const ASSET_ID_PATTERN = /^[a-f0-9-]+\.(png|jpg|jpeg|svg|webp|gif)$/i;

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Lets an operator upload a custom icon image (for widgets whose `icon`
 * property doesn't come from Iconify) and serves it back. Files are capped
 * at 2MB (see @fastify/multipart registration in app.ts) and validated by
 * MIME type before being written, both to keep the icons directory small
 * and to avoid writing arbitrary uploaded content with a misleading
 * extension.
 */
export async function registerIconRoutes(app: FastifyInstance, runtime: Runtime): Promise<void> {
  app.post("/api/icons", async (request, reply) => {
    const file = await request.file({ limits: { fileSize: 2 * 1024 * 1024 } });
    if (!file) return reply.code(400).send({ error: "VALIDATION_FAILED", message: "Aucun fichier reçu" });

    const extension = ALLOWED_EXTENSIONS[file.mimetype];
    if (!extension) {
      return reply
        .code(400)
        .send({ error: "VALIDATION_FAILED", message: `Type d'image non supporté : ${file.mimetype}` });
    }

    const buffer = await file.toBuffer();
    const assetId = `${randomUUID()}.${extension}`;
    await writeFile(join(runtime.config.iconsDir, assetId), buffer);

    return reply.code(201).send({ assetId });
  });

  app.get<{ Params: { assetId: string } }>("/api/icons/:assetId", async (request, reply) => {
    const { assetId } = request.params;
    if (!ASSET_ID_PATTERN.test(assetId)) return reply.code(400).send({ error: "INVALID_ASSET_ID" });

    const path = join(runtime.config.iconsDir, assetId);
    if (!existsSync(path)) return reply.code(404).send({ error: "ICON_NOT_FOUND" });

    const extension = assetId.split(".").pop()!.toLowerCase();
    reply.type(CONTENT_TYPES[extension] ?? "application/octet-stream");
    reply.header("cache-control", "public, max-age=31536000, immutable");
    return reply.send(createReadStream(path));
  });
}
