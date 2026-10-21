import { Page,expect } from '@playwright/test';

// 全局会话状态（跨测试文件共享）
const globalLoginState = {
  isLoggedIn: false,
  lastLoginTime: 0,
  loginPromise: null as Promise<void> | null,
};

// 测试用的 API Key（需要在数据库中预先创建）
// 这个 Key 应该有 asn:*, sku:*, order:* 的权限
export const TEST_API_KEY = process.env.TEST_API_KEY || 'wms_test_key_for_e2e_testing';

// 全局会话管理
class SessionManager {
  private static instance: SessionManager;
  private isLoggedIn: boolean = false;
  private lastLoginTime: number = 0;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟会话超时

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  isSessionExpired(): boolean {
    return Date.now() - this.lastLoginTime > this.SESSION_TIMEOUT;
  }

  markLoggedIn(): void {
    this.isLoggedIn = true;
    this.lastLoginTime = Date.now();
  }

  markLoggedOut(): void {
    this.isLoggedIn = false;
    this.lastLoginTime = 0;
  }

  shouldLogin(): boolean {
    return !this.isLoggedIn || this.isSessionExpired();
  }
}

/**
 * 检查当前会话是否有效（优化版）
 */
async function isSessionValid(page: Page): Promise<boolean> {
  const sessionManager = SessionManager.getInstance();

  // 首先检查全局会话状态
  if (!sessionManager.shouldLogin()) {
    console.log('Session should be valid based on cache - doing quick check');
    // 快速页面检查确认会话仍然有效
    try {
      const currentUrl = page.url();

      // 如果在登录页面，会话肯定无效
      if (currentUrl.includes('/login')) {
        console.log('On login page - session invalid');
        sessionManager.markLoggedOut();
        return false;
      }

      // 尝试访问dashboard来验证会话
      await page.goto('/dashboard', { timeout: 5000, waitUntil: 'domcontentloaded' });

      // 检查是否重定向到登录页
      if (page.url().includes('/login')) {
        console.log('Redirected to login - session expired');
        sessionManager.markLoggedOut();
        return false;
      }

      // 检查是否有用户信息元素
      try {
        const userElement = await page.locator('text=系统管理员').first();
        await userElement.waitFor({ timeout: 2000 });
        console.log('Session is valid - cached login still active');
        return true;
      } catch {
        console.log('No user element found - session may be invalid');
        sessionManager.markLoggedOut();
        return false;
      }
    } catch (error) {
      console.log('Cached session check failed:', error instanceof Error ? error.message : String(error));
      sessionManager.markLoggedOut();
    }
  }

  // 详细的页面检查
  try {
    const currentUrl = page.url();

    // 如果在登录页面，说明会话无效
    if (currentUrl.includes('/login')) {
      console.log('On login page - session invalid');
      sessionManager.markLoggedOut();
      return false;
    }

    // 如果已经在仪表板，快速检查用户信息
    if (currentUrl.includes('/dashboard')) {
      try {
        const userElement = await page.locator('text=系统管理员').first();
        await userElement.waitFor({ timeout: 1000 });
        console.log('Session is valid - already on dashboard');
        sessionManager.markLoggedIn();
        return true;
      } catch {
        console.log('On dashboard but user element not found');
        sessionManager.markLoggedOut();
        return false;
      }
    }

    // 其他页面，尝试访问dashboard来检查
    console.log('Checking session by accessing dashboard...');
    await page.goto('/dashboard', { timeout: 5000, waitUntil: 'domcontentloaded' });

    // 如果重定向到登录页，会话无效
    if (page.url().includes('/login')) {
      console.log('Redirected to login - session invalid');
      sessionManager.markLoggedOut();
      return false;
    }

    // 检查用户元素
    try {
      const userElement = await page.locator('text=系统管理员').first();
      await userElement.waitFor({ timeout: 2000 });
      console.log('Session is valid - dashboard accessible');
      sessionManager.markLoggedIn();
      return true;
    } catch {
      console.log('No user element found - session invalid');
      sessionManager.markLoggedOut();
      return false;
    }
  } catch (error) {
    console.log('Session check failed:', error instanceof Error ? error.message : String(error));
    sessionManager.markLoggedOut();
    return false;
  }
}

/**
 * 登录为管理员 - 真正的全局会话复用版本
 */
export async function loginAsAdmin(page: Page) {
  // 如果已经在登录中，等待登录完成
  if (globalLoginState.loginPromise) {
    console.log('Login in progress, waiting for completion...');
    await globalLoginState.loginPromise;
    return;
  }

  // 检查全局登录状态
  if (globalLoginState.isLoggedIn && !isGlobalSessionExpired()) {
    console.log('Using global cached session - no login needed');
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
      } catch (e) {
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
        throw new Error(`Failed to login after ${maxRetries} attempts. Last error: ${error}`);
      }

      // 减少重试间隔
      await page.waitForTimeout(2000);
    }
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
