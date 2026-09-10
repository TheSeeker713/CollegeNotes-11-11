import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true
  },
  webServer: {
    command: 'npm run preview -w @collegenotes/web',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 60_000
  },
  projects: [
    { name: 'e2e', testMatch: /.*\.spec\.ts/ },
    { name: 'accessibility', testMatch: /.*\.a11y\.ts/ }
  ]
});
