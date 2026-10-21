import { expect,test } from '@playwright/test';

test.describe('登录页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('页面应该正确加载', async ({ page }) => {
    // 检查页面 URL
    await expect(page).toHaveURL(/.*login/);

    // 检查关键元素存在
    await expect(page.locator('input#tenantCode')).toBeVisible();
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('表单字段应该可以输入', async ({ page }) => {
    // 填写租户代码
    await page.fill('input#tenantCode', 'TEST_TENANT');
    await expect(page.locator('input#tenantCode')).toHaveValue('TEST_TENANT');

    // 填写用户名
    await page.fill('input#username', 'testuser');
    await expect(page.locator('input#username')).toHaveValue('testuser');

    // 填写密码
    await page.fill('input#password', 'testpassword');
    await expect(page.locator('input#password')).toHaveValue('testpassword');
  });

  test('密码显示/隐藏切换', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    // 密码输入框旁边的眼睛图标按钮
    const toggleButton = page.locator('input#password').locator('..').locator('button');

    // 默认是密码模式
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 点击切换按钮
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // 再次点击切换回密码模式
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('完整登录流程', async ({ page }) => {
    // 填写表单
    await page.fill('input#tenantCode', 'DEFAULT');
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');

    // 点击登录按钮
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 等待响应
    await page.waitForTimeout(2000);
  });
});

test.describe('首页访问控制', () => {
  test('未登录用户应重定向到登录页', async ({ page }) => {
    await page.goto('/dashboard');

    // 验证重定向到登录页
    await expect(page).toHaveURL(/.*login/);
  });
});
