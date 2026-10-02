import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:5175" },
  webServer: [
    {
      command: "npm run start:prod",
      cwd: "../backend",
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5175 --strictPort",
      url: "http://127.0.0.1:5175",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
