import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/**/*.test.ts",
      "packages/**/*.test.ts",
      "plugins/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
