import { Page } from '@playwright/test';
import { loginAsAdmin } from './auth-helpers';

/**
 * 登录状态管理
 * 使用 storageState 保存登录状态，避免重复登录
 */

let adminStorageState: any = null;

/**
 * 确保管理员已登录
 * 如果已有存储状态则重用，否则执行登录并保存状态
 */
export async function ensureAdminLoggedIn(page: Page) {
  // 如果已有存储状态，直接使用
  if (adminStorageState) {
    await page.context().addCookies(adminStorageState.cookies);
    return;
  }

  // 执行登录
  await loginAsAdmin(page);

  // 保存登录状态
  adminStorageState = await page.context().storageState();
}

/**
 * 清除保存的登录状态（用于测试清理）
 */
export function clearAuthState() {
  adminStorageState = null;
}
