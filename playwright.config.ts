import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3456",
    headless: true,
    channel: "msedge",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3456",
    reuseExistingServer: true,
  },
});
