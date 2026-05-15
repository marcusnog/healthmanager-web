import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const backendProject = path.resolve(
  __dirname,
  "../HealthManager/src/HealthManager.Api/HealthManager.Api.csproj",
);

export default defineConfig({
  testDir: "./tests/e2e-real",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report-real" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `dotnet run --project "${backendProject}" --urls=http://127.0.0.1:8080`,
      url: "http://127.0.0.1:8080/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ASPNETCORE_ENVIRONMENT: "Development",
        USE_INMEMORY_DATABASE: "true",
        INMEMORY_DATABASE_NAME: "healthmanager-playwright-real",
        JWT_ISSUER: "healthmanager",
        JWT_AUDIENCE: "healthmanager-web",
        JWT_SECRET: "change-me-super-secret-key-32-bytes",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        API_PROXY_TARGET: "http://127.0.0.1:8080",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
