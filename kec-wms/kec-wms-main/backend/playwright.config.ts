import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载测试环境变量
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '.env.test') });
}

// Session 状态文件路径
const STORAGE_STATE_PATH = path.join(__dirname, 'e2e/.auth/admin.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 串行执行避免登录冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60 * 1000,
  reporter: 'html',

  // 全局 Setup：在所有测试前执行一次登录
  globalSetup: require.resolve('./e2e/global-setup'),

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // 使用保存的 session 状态，所有测试共享登录态
    storageState: STORAGE_STATE_PATH,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== undefined)
    ) as Record<string, string>,
  },
});
