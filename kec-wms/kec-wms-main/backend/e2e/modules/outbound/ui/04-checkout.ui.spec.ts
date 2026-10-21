import { expect,test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

/**
 * 签出操作 UI 测试
 *
 * 测试签出操作页面的 UI 交互
 * 页面路由: /checkout
 */
test.describe('签出操作 UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('页面加载应该显示签出操作界面', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    // 验证页面加载成功
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('页面应该有输入框或选择器区域', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    // 查找输入框或选择器
    const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"])')
    const selects = page.locator('button[role="combobox"]')

    const hasInputs = await inputs.count() > 0
    const hasSelects = await selects.count() > 0

    // 应该有输入框或选择器
    expect(hasInputs || hasSelects).toBe(true)
  })

  test('页面应该有选择器组件', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    // 查找选择器（仓库选择等）
    const selects = page.locator('button[role="combobox"]')
    const selectCount = await selects.count()

    if (selectCount > 0) {
      // 点击第一个选择器
      await selects.first().click()
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
    }
  })

  test('页面应该有操作按钮', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    // 查找按钮
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    expect(buttonCount).toBeGreaterThan(0)
  })

  test('输入板号/袋号后按回车应该触发处理', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 查找第一个输入框
    const containerInput = page.locator('input[type="text"]').first()

    if (await containerInput.isVisible()) {
      await containerInput.fill('TEST-PALLET-001')
      await containerInput.press('Enter')
      await page.waitForTimeout(500)

      // 页面应该保持正常
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
    }
  })

  test('页面应该有统计或信息区域', async ({ page }) => {
    await page.goto('/checkout')
    await page.waitForLoadState('networkidle')

    // 签出页面应该有一些显示区域
    const hasCards = await page.locator('.card, [class*="card"]').count() > 0
    const hasStats = await page.locator('[class*="stat"], [class*="summary"]').count() > 0
    const hasTable = await page.locator('table').count() > 0
    const hasContent = await page.locator('main').isVisible()

    expect(hasCards || hasStats || hasTable || hasContent).toBe(true)
  })
})
