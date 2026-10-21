import { defineConfig, devices } from '@playwright/test';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const springDir = path.resolve(__dirname, '../Dose Certa Spring');

const E2E_ADMIN_LOGIN = process.env.E2E_ADMIN_LOGIN || 'admin_e2e_local';
const E2E_ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD || `E2eRuntime_${crypto.randomBytes(12).toString('hex')}!`;

process.env.E2E_ADMIN_LOGIN = E2E_ADMIN_LOGIN;
process.env.E2E_ADMIN_PASSWORD = E2E_ADMIN_PASSWORD;

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8080';
process.env.PLAYWRIGHT_API_URL = apiURL;

const isExternalTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isExternalTarget
    ? undefined
    : [
        {
          command:
            process.platform === 'win32'
              ? '.\\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=test"'
              : 'bash ./mvnw spring-boot:run -Dspring-boot.run.profiles=test',
          cwd: springDir,
          url: 'http://localhost:8080/health/ready',
          timeout: 120000,
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            SPRING_PROFILES_ACTIVE: 'test',
            APP_BOOTSTRAP_ADMIN_ENABLED: 'true',
            APP_BOOTSTRAP_ADMIN_LOGIN: E2E_ADMIN_LOGIN,
            APP_BOOTSTRAP_ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
          },
        },
        {
          command: 'npm run dev -- --port 5173 --strictPort',
          cwd: __dirname,
          url: 'http://localhost:5173',
          timeout: 60000,
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            VITE_API_BASE_URL: apiURL,
          },
        },
      ],
});
