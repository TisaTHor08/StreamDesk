import { describe, expect, it } from "vitest";
import { parsePluginManifest } from "./schema.js";

const validManifest = {
  id: "community.example",
  name: "Example Plugin",
  version: "1.0.0",
  apiVersion: "1",
  license: "MIT",
  author: { name: "Someone" },
  components: { server: { entrypoint: "./server/index.js" } },
  contributes: { actions: ["community.example.ping"] },
  permissions: ["events.publish"],
};

describe("parsePluginManifest", () => {
  it("accepts a valid manifest with only a server component", () => {
    const result = parsePluginManifest(validManifest);
    expect(result.ok).toBe(true);
  });

  it("rejects a manifest declaring no components at all", () => {
    const result = parsePluginManifest({ ...validManifest, components: {} });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown permission", () => {
    const result = parsePluginManifest({ ...validManifest, permissions: ["totally.made.up"] });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid plugin id (uppercase / spaces)", () => {
    const result = parsePluginManifest({ ...validManifest, id: "Not A Valid Id" });
    expect(result.ok).toBe(false);
  });

  it("accepts a manifest with all three components", () => {
    const result = parsePluginManifest({
      ...validManifest,
      components: {
        server: { entrypoint: "./server/index.js" },
        connect: { entrypoint: "./connect/index.js", platforms: ["linux"], architectures: ["arm64"] },
        interface: { entrypoint: "./interface/index.tsx" },
      },
    });
    expect(result.ok).toBe(true);
  });
});
