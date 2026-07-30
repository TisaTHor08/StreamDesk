import { defineConfig } from "@playwright/test";

/**
 * Single V1 end-to-end scenario (spec section 31): open the admin, look at
 * the seeded "Accueil" page, switch to the Deck, press the counter button,
 * and verify the bound counter widget updates.
 *
 * Requires the Server (with core-actions + example-plugin loaded) and the
 * Interface dev server to already be running — see docs/installation for
 * the exact commands. Not run automatically by `pnpm test` (which only
 * covers unit/integration tests); run explicitly with `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
  },
});
