import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: {
      ...(process.env.STUDIO_CHROMIUM_PATH
        ? { executablePath: process.env.STUDIO_CHROMIUM_PATH }
        : {}),
      // Software WebGL is explicit in headless CI; production uses the user's GPU.
      args: ["--enable-unsafe-swiftshader"],
    },
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run dev -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
