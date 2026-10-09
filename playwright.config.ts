import { defineConfig } from '@playwright/test';
const base = (process.env.BASE_PATH || '/Blog').replace(/\/$/, '');
export default defineConfig({
  testDir: './tests', testMatch: 'browser.spec.ts', fullyParallel: false,
  use: { baseURL: `http://localhost:4321${base}/`, browserName: 'chromium', trace: 'retain-on-failure', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4321 --ignore-lock', env: { BASE_PATH: base || '/' }, url: `http://localhost:4321${base}/en/`, reuseExistingServer: false, timeout: 30000 },
  reporter: 'list',
});
