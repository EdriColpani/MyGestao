import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3044",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium-mobile", use: { ...devices["Pixel 5"] } }],
  webServer: {
    command: "npm run dev -- --port 3044",
    url: "http://127.0.0.1:3044",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3333",
    },
  },
});
