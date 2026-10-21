import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth/admin.json');
const E2E_TENANT_CODE = 'E2E-TEST';
const E2E_ADMIN_USERNAME = 'e2e-admin';
const E2E_ADMIN_PASSWORD = 'Admin@123';

/**
 * 全局 Setup：在所有测试开始前执行一次登录
 * 将 session cookie 保存到文件，所有测试共享
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log('🔐 Global Setup: Performing one-time login...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`Login attempt ${attempt}/${maxRetries}`);

      // 访问登录页面
      await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 等待表单加载
      await page.waitForSelector('input#tenantCode', { timeout: 15000 });

      // 填写登录信息
      await page.locator('input#tenantCode').fill(E2E_TENANT_CODE);
      await page.locator('input#username').fill(E2E_ADMIN_USERNAME);
      await page.locator('input#password').fill(E2E_ADMIN_PASSWORD);

      // 点击登录
      await page.locator('button[type="submit"]').click();

      // 等待登录成功
      await page.waitForURL(/.*dashboard/, { timeout: 30000, waitUntil: 'domcontentloaded' });

      console.log('✅ Global Setup: Login successful');

      // 保存 session 状态到文件
      await context.storageState({ path: STORAGE_STATE_PATH });
      console.log(`✅ Session saved to ${STORAGE_STATE_PATH}`);

      await browser.close();
      return;

    } catch (error) {
      console.error(`Login attempt ${attempt} failed:`, error);

      if (attempt >= maxRetries) {
        await browser.close();
        throw new Error(`Global setup failed: Could not login after ${maxRetries} attempts`);
      }

      // 等待后重试
      await page.waitForTimeout(2000);
    }
  }
}

export default globalSetup;
