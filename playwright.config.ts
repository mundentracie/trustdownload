import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
  },
  // serves test/download.html + sample files so the e2e tests can trigger real downloads
  webServer: {
    command: 'node scripts/test-server.mjs',
    port: 8080,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
