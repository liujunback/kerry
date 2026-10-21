import { Page, expect } from '@playwright/test';

export const E2E_TENANT_CODE = 'E2E-TEST';
export const E2E_ADMIN_USERNAME = 'e2e-admin';
export const E2E_ADMIN_PASSWORD = 'Admin@123';

export const TEST_API_KEY = process.env.TEST_API_KEY || 'wms_test_key_for_e2e_testing';

const globalLoginState = {
  isLoggedIn: false,
  lastLoginTime: 0,
  loginPromise: null as Promise<void> | null,
  currentTenantCode: null as string | null,
  currentUsername: null as string | null,
};

async function getCurrentSessionIdentity(page: Page): Promise<{
  tenantCode: string | null;
  username: string | null;
} | null> {
  try {
    const response = await page.request.get('/api/v1/auth/me');
    if (!response.ok()) {
      return null;
    }

    const result = await response.json();
    if (!result?.success || !result?.data) {
      return null;
    }

    return {
      tenantCode: result.data.tenant?.tenantCode ?? null,
      username: result.data.username ?? null,
    };
  } catch {
    return null;
  }
}

async function performGlobalLogin(page: Page): Promise<void> {
  console.log('Performing global login...');

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      console.log(`Login attempt ${attempt + 1}/${maxRetries}`);

      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

      try {
        await page.evaluate(() => {
          if (typeof Storage !== 'undefined') {
            localStorage.clear();
            sessionStorage.clear();
          }
        });
      } catch {
        // Ignore storage cleanup errors.
      }

      await page.waitForTimeout(1000);
      await page.waitForSelector('input#tenantCode', { timeout: 15000 });
      await page.waitForSelector('input#username', { timeout: 15000 });
      await page.waitForSelector('input#password', { timeout: 15000 });

      await page.locator('input#tenantCode').fill(E2E_TENANT_CODE);
      await page.locator('input#username').fill(E2E_ADMIN_USERNAME);
      await page.locator('input#password').fill(E2E_ADMIN_PASSWORD);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.waitFor({ state: 'visible', timeout: 15000 });
      await expect(submitButton).toBeEnabled({ timeout: 5000 });
      await submitButton.click();

      await page.waitForURL(/.*dashboard/, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h2', { timeout: 10000 });

      globalLoginState.isLoggedIn = true;
      globalLoginState.lastLoginTime = Date.now();
      globalLoginState.currentTenantCode = E2E_TENANT_CODE;
      globalLoginState.currentUsername = E2E_ADMIN_USERNAME;
      return;
    } catch (error) {
      attempt++;
      console.error(`Login attempt ${attempt} failed:`, error);
      console.log('Current URL:', page.url());

      if (attempt >= maxRetries) {
        resetGlobalLoginState();
        throw new Error(`Failed to login after ${maxRetries} attempts. Last error: ${error}`);
      }

      await page.waitForTimeout(2000);
    }
  }
}

export async function loginAsAdmin(page: Page) {
  const needsSwitchAccount =
    globalLoginState.currentTenantCode !== null &&
    (globalLoginState.currentTenantCode !== E2E_TENANT_CODE ||
      globalLoginState.currentUsername !== E2E_ADMIN_USERNAME);

  if (needsSwitchAccount) {
    console.log(
      `Switching account ${globalLoginState.currentTenantCode}/${globalLoginState.currentUsername} -> ${E2E_TENANT_CODE}/${E2E_ADMIN_USERNAME}`
    );
    resetGlobalLoginState();
    globalLoginState.loginPromise = performGlobalLogin(page);
    try {
      await globalLoginState.loginPromise;
    } finally {
      globalLoginState.loginPromise = null;
    }
    return;
  }

  try {
    if (!page.url().includes('/dashboard')) {
      await page.goto('/dashboard', { timeout: 10000, waitUntil: 'domcontentloaded' });
    }

    if (!page.url().includes('/login')) {
      const sessionIdentity = await getCurrentSessionIdentity(page);
      if (
        sessionIdentity?.tenantCode === E2E_TENANT_CODE &&
        sessionIdentity.username === E2E_ADMIN_USERNAME
      ) {
        globalLoginState.isLoggedIn = true;
        globalLoginState.lastLoginTime = Date.now();
        globalLoginState.currentTenantCode = E2E_TENANT_CODE;
        globalLoginState.currentUsername = E2E_ADMIN_USERNAME;
        return;
      }

      console.log(
        `Session tenant mismatch, expected ${E2E_TENANT_CODE}/${E2E_ADMIN_USERNAME} but got ${sessionIdentity?.tenantCode}/${sessionIdentity?.username}`
      );
    } else {
      console.log('Session invalid, performing login...');
    }
  } catch {
    console.log('Session check failed, will login');
  }

  if (globalLoginState.loginPromise) {
    console.log('Login in progress, waiting for completion...');
    await globalLoginState.loginPromise;
    return;
  }

  globalLoginState.loginPromise = performGlobalLogin(page);
  try {
    await globalLoginState.loginPromise;
  } finally {
    globalLoginState.loginPromise = null;
  }
}

export async function loginAs(
  page: Page,
  tenantCode: string,
  username: string,
  password: string
) {
  if (
    globalLoginState.currentTenantCode !== tenantCode ||
    globalLoginState.currentUsername !== username
  ) {
    console.log(
      `Switching login ${globalLoginState.currentTenantCode}/${globalLoginState.currentUsername} -> ${tenantCode}/${username}`
    );
    resetGlobalLoginState();
  }

  await page.goto('/login');
  await page.fill('input#tenantCode', tenantCode);
  await page.fill('input#username', username);
  await page.fill('input#password', password);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  await page.waitForURL(/.*dashboard/, { timeout: 10000 });

  globalLoginState.isLoggedIn = true;
  globalLoginState.lastLoginTime = Date.now();
  globalLoginState.currentTenantCode = tenantCode;
  globalLoginState.currentUsername = username;
}

export function resetGlobalLoginState() {
  globalLoginState.isLoggedIn = false;
  globalLoginState.lastLoginTime = 0;
  globalLoginState.loginPromise = null;
  globalLoginState.currentTenantCode = null;
  globalLoginState.currentUsername = null;
}
