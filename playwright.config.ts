/**
 * End-to-end tests against the built site (`dist/`), served by `astro preview`.
 *
 * `pnpm test:e2e` builds first and then runs everything here. To re-run
 * against an existing build, use `pnpm exec playwright test`.
 * See ARCHITECTURE.md, "Checks".
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4630;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries only in CI, where a shared runner can stall; a test that passes on
  // retry is reported as "flaky", not hidden. Locally a failure is a failure.
  retries: process.env.CI ? 1 : 0,
  // GitHub-hosted runners have 4 vCPUs (public repos) or 2 (private). Each
  // worker drives a Chromium running axe next to the preview server, so 2 is
  // the safe default there. Locally Playwright uses half the cores. Override
  // with --workers.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // --ignore-lock keeps the server in the foreground, owned (and stopped) by
    // Playwright: without it, Astro moves the preview into the background when
    // it detects a coding agent, and leaves its lock file for other previews.
    command: `astro preview --port ${PORT} --host localhost --ignore-lock`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
