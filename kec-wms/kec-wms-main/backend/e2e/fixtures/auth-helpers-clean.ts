import { Page,expect } from '@playwright/test';

// 测试用的 API Key（需要在数据库中预先创建）
// 这个 Key 应该有 asn:*, sku:*, order:* 的权限
export const TEST_API_KEY = process.env.TEST_API_KEY || 'wms_test_key_for_e2e_testing';

// 全局会话状态（跨测试文件共享）
const globalLoginState = {
  isLoggedIn: false,
  lastLoginTime: 0,
  loginPromise: null as Promise<void> | null,
};

/**
 * 检查全局会话是否过期
 */
function isGlobalSessionExpired(): boolean {
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟
  return Date.now() - globalLoginState.lastLoginTime > SESSION_TIMEOUT;
}

/**
 * 执行实际登录操作
 */
async function performGlobalLogin(page: Page): Promise<void> {
  console.log('🔐 Performing global login...');

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Login attempt ${attempt + 1}/${maxRetries}`);

      // 执行登录
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 清除存储（在页面加载后）
      try {
        await page.evaluate(() => {
          if (typeof Storage !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
          }
        });
      } catch {
        // 忽略存储清理错误
      }

      // 等待页面稳定（减少等待时间）
      await page.waitForTimeout(1000);

      // 等待登录表单加载完成
      await page.waitForSelector('input#tenantCode', { timeout: 15000 });
      await page.waitForSelector('input#username', { timeout: 15000 });
      await page.waitForSelector('input#password', { timeout: 15000 });

      // 填写登录信息
      await page.locator('input#tenantCode').fill('DEFAULT');
      await page.locator('input#username').fill('admin');
      await page.locator('input#password').fill('Admin@123');

      // 等待提交按钮可用
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.waitFor({ state: 'visible', timeout: 15000 });
      await expect(submitButton).toBeEnabled({ timeout: 5000 });

      // 点击登录按钮
      await submitButton.click();

      // 等待跳转到仪表板
      await page.waitForURL(/.*dashboard/, { timeout: 45000 });

      // 确认页面加载完成
      await page.waitForSelector('h2', { timeout: 10000 });

      console.log('✅ Global login successful');

      // 标记全局登录成功
      globalLoginState.isLoggedIn = true;
      globalLoginState.lastLoginTime = Date.now();
      return;

    } catch (error) {
      attempt++;
      console.error(`Login attempt ${attempt} failed:`, error);
      console.log('Current URL:', page.url());

      if (attempt >= maxRetries) {
        globalLoginState.isLoggedIn = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to login after ${maxRetries} attempts. Last error: ${errorMessage}`);
      }

      // 减少重试间隔
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * 登录为管理员 - 真正的全局会话复用版本
 * 核心优化：整个测试进程只登录一次！
 */
export async function loginAsAdmin(page: Page) {
  // 如果已经在登录中，等待登录完成
  if (globalLoginState.loginPromise) {
    console.log('🔄 Login in progress, waiting for completion...');
    await globalLoginState.loginPromise;
    return;
  }

  // 检查全局登录状态
  if (globalLoginState.isLoggedIn && !isGlobalSessionExpired()) {
    console.log('✅ Using global cached session - no login needed');
    // 快速验证页面是否需要导航到dashboard
    try {
      const currentUrl = page.url();
      if (!currentUrl.includes('/dashboard')) {
        await page.goto('/dashboard', { timeout: 5000, waitUntil: 'domcontentloaded' });
      }
      return;
    } catch (error) {
      console.log('Session validation failed, will re-login');
      globalLoginState.isLoggedIn = false;
    }
  }

  // 执行登录
  globalLoginState.loginPromise = performGlobalLogin(page);
  try {
    await globalLoginState.loginPromise;
  } finally {
    globalLoginState.loginPromise = null;
  }
}

/**
 * 登录为指定用户
 */
export async function loginAs(
  page: Page,
  tenantCode: string,
  username: string,
  password: string
) {
  await page.goto('/login');

  await page.fill('input#tenantCode', tenantCode);
  await page.fill('input#username', username);
  await page.fill('input#password', password);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  await page.waitForURL(/.*dashboard/, { timeout: 10000 });
}

/**
 * 重置全局登录状态（测试清理时使用）
 */
export function resetGlobalLoginState() {
  globalLoginState.isLoggedIn = false;
  globalLoginState.lastLoginTime = 0;
  globalLoginState.loginPromise = null;
}
