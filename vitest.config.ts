/**
 * Unit tests for the pure logic in src/lib and the widgets (`pnpm test`).
 * Any `tests/unit/**\/*.test.ts` file is picked up; JSON imports work as in Astro.
 * The browser tests in tests/e2e run under Playwright instead (`pnpm test:e2e`).
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
