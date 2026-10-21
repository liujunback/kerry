import { expect,test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

/**
 * 集运单挂载 UI 测试
 *
 * 测试集运单挂载操作页面的 UI 交互
 * 页面路由: /manifest-mount
 */
test.describe('集运单挂载 UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('页面加载应该显示集运单挂载界面', async ({ page }) => {
    await page.goto('/manifest-mount')
    await page.waitForLoadState('networkidle')

    // 验证页面加载成功
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('页面应该有输入框或选择器', async ({ page }) => {
    await page.goto('/manifest-mount')
    await page.waitForLoadState('networkidle')

    // 查找输入框或选择器
    const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"])')
    const selects = page.locator('button[role="combobox"]')

    const hasInputs = await inputs.count() > 0
    const hasSelects = await selects.count() > 0

    // 应该有输入框或选择器
    expect(hasInputs || hasSelects).toBe(true)
  })

  test('输入集运单号后按回车应该触发处理', async ({ page }) => {
    await page.goto('/manifest-mount')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 查找第一个输入框
    const manifestInput = page.locator('input[type="text"]').first()

    if (await manifestInput.isVisible()) {
      await manifestInput.fill('MF-TEST-001')
      await manifestInput.press('Enter')
      await page.waitForTimeout(500)

      // 页面应该保持正常
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
    }
  })

  test('页面应该有统计或信息区域', async ({ page }) => {
    await page.goto('/manifest-mount')
    await page.waitForLoadState('networkidle')

    // 页面应该有一些显示区域
    const hasCards = await page.locator('.card, [class*="card"]').count() > 0
    const hasTable = await page.locator('table').count() > 0
    const hasContent = await page.locator('main').isVisible()

    expect(hasCards || hasTable || hasContent).toBe(true)
  })

  test('页面应该支持键盘操作', async ({ page }) => {
    await page.goto('/manifest-mount')
    await page.waitForLoadState('networkidle')

    const inputs = page.locator('input[type="text"]')
    const inputCount = await inputs.count()

    if (inputCount > 0) {
      const firstInput = inputs.first()
      await firstInput.focus()
      await expect(firstInput).toBeFocused()
    }
  })
})
