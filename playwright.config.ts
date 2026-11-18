import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env["PREVIEW_PORT"]) || 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: "list",
  use: {
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
      ? { executablePath: process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"] }
      : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
