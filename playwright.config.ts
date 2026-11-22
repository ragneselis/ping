import { defineConfig } from "@playwright/test";

/**
 * The alignment guard (tests/alignment.spec.ts): npm run check:align, and in CI (.github/workflows/checks.yml).
 * Locally it reuses a running dev server on CHECK_BASE_URL (default http://localhost:3000) or starts one,
 * and drives the installed Google Chrome; CI builds, starts the production server and uses Playwright's
 * Chromium. Every case runs in Chromium and WebKit (Safari's engine). /stats is checked when STATS_PASSWORD
 * is set.
 */
const ci = !!process.env.CI;
const baseURL = process.env.CHECK_BASE_URL ?? (ci ? "http://localhost:3100" : "http://localhost:3000");

export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  fullyParallel: true,
  workers: ci ? 2 : 4,
  reporter: ci ? [["list"], ["github"]] : "list",
  use: {
    baseURL,
    contextOptions: { reducedMotion: "reduce" },
    httpCredentials: process.env.STATS_PASSWORD ? { username: "check", password: process.env.STATS_PASSWORD } : undefined,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium", channel: ci ? undefined : "chrome" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: process.env.CHECK_BASE_URL
    ? undefined
    : {
        command: ci ? "npm run start -- -p 3100" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !ci,
        timeout: 180_000,
      },
});
