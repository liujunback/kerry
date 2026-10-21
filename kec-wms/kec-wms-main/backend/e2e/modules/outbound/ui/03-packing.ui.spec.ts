import { expect,test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

/**
 * 打包操作 UI 测试
 *
 * 测试打包操作页面的 UI 交互
 * 页面路由: /packing
 *
 * 打包流程:
 * 1. 扫描拣货单号/订单号
 * 2. 扫描 SKU 条码
 * 3. 选择包材
 * 4. 关箱
 */
test.describe('打包操作 UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('页面加载应该显示打包操作界面', async ({ page }) => {
    await page.goto('/packing')
    await page.waitForLoadState('networkidle')

    // 验证页面加载成功
    const mainContent = page.locator('main')
    await expect(mainContent).toBeVisible()
  })

  test('页面应该有扫描输入区域', async ({ page }) => {
    await page.goto('/packing')
    await page.waitForLoadState('networkidle')

    // 查找输入框（包括各种类型）
    const textInputs = page.locator('input[type="text"]')
    const searchInputs = page.locator('input[type="search"]')
    const allInputs = page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])')

    const hasInputs = await textInputs.count() > 0 || await searchInputs.count() > 0 || await allInputs.count() > 0

    // 页面应该有某种输入方式
    expect(hasInputs).toBe(true)
  })

  test('输入无效单号应该保持页面正常', async ({ page }) => {
    await page.goto('/packing')
    await page.waitForLoadState('networkidle')

    // 查找第一个输入框
    const scanInput = page.locator('input[type="text"]').first()

    if (await scanInput.isVisible()) {
      await scanInput.fill('INVALID-NUMBER-12345')
      await scanInput.press('Enter')
      await page.waitForTimeout(1000)

      // 页面应该保持正常（不崩溃）
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()
    }
  })

  test('页面应该使用三栏或卡片布局', async ({ page }) => {
    await page.goto('/packing')
    await page.waitForLoadState('networkidle')

    // 验证页面有布局容器
    const hasGrid = await page.locator('.grid, [class*="grid"]').count() > 0
    const hasCards = await page.locator('.card, [class*="card"], [class*="Card"]').count() > 0
    const hasColumns = await page.locator('[class*="col-"]').count() > 0

    expect(hasGrid || hasCards || hasColumns).toBe(true)
  })

  test('页面应该支持键盘操作', async ({ page }) => {
    await page.goto('/packing')
    await page.waitForLoadState('networkidle')

    // 查找第一个输入框
    const scanInput = page.locator('input[type="text"]').first()

    if (await scanInput.isVisible()) {
      // 聚焦输入框
      await scanInput.focus()

      // 输入内容
      await scanInput.fill('TEST')

      // 验证输入成功
      await expect(scanInput).toHaveValue('TEST')

      // 按回车
      await scanInput.press('Enter')
      await page.waitForTimeout(500)
    }
  })

  test('扫描输入框应该可以聚焦', async ({ page }) => {
    await page.goto('/packing')
    await page.waitForLoadState('networkidle')

    const scanInput = page.locator('input[type="text"]').first()

    if (await scanInput.isVisible()) {
      await scanInput.focus()
      await expect(scanInput).toBeFocused()
    }
  })
})
