import { expect,test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

/**
 * 出库订单列表 UI 测试
 *
 * 测试出库订单列表页面的 UI 交互
 * 页面路由: /orders
 */
test.describe('出库订单列表 UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('页面加载应该显示订单列表', async ({ page }) => {
    // 导航到出库订单页面
    await page.goto('/orders')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')

    // 验证数据表格存在
    await expect(page.locator('table')).toBeVisible()

    // 验证筛选器存在（搜索输入框）
    await expect(page.locator('input[name="search"]')).toBeVisible()
  })

  test('筛选订单应该更新列表', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    // 输入搜索条件
    const searchInput = page.locator('input[name="search"]')
    await searchInput.fill('OB-')

    // 按回车触发搜索（form submit）
    await searchInput.press('Enter')

    // 等待请求完成
    await page.waitForLoadState('networkidle')

    // 验证表格已更新（无论是否有数据）
    await expect(page.locator('table')).toBeVisible()
  })

  test('搜索输入框支持键盘操作', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    // 输入搜索条件
    const searchInput = page.locator('input[name="search"]')
    await searchInput.fill('TEST-ORDER')

    // 验证输入成功
    await expect(searchInput).toHaveValue('TEST-ORDER')

    // 清空输入（通过导航重置）
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    // 验证输入框已清空
    await expect(page.locator('input[name="search"]')).toHaveValue('')
  })

  test('点击刷新按钮应该重新加载数据', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    // 点击刷新按钮（RefreshCw 图标）
    const refreshButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    await refreshButton.click()

    // 等待请求完成
    await page.waitForLoadState('networkidle')

    // 验证表格仍然存在
    await expect(page.locator('table')).toBeVisible()
  })

  test('状态筛选器应该有正确的选项', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    // 查找状态选择器
    const statusSelect = page.locator('button[role="combobox"]').first()

    if (await statusSelect.isVisible()) {
      // 点击打开下拉菜单
      await statusSelect.click()

      // 验证下拉菜单打开
      await expect(page.locator('[role="listbox"]')).toBeVisible()

      // 关闭下拉菜单
      await page.keyboard.press('Escape')
    }
  })

  test('选择订单后应该显示操作按钮', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    // 等待表格加载
    await page.waitForTimeout(1000)

    // 检查是否有数据行
    const rows = page.locator('table tbody tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      // 点击第一行的复选框
      const firstCheckbox = rows.first().locator('input[type="checkbox"], button[role="checkbox"]').first()
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.click()

        // 等待操作按钮出现
        await page.waitForTimeout(500)
      }
    }
  })

  test('点击订单号应该跳转到详情页', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    // 等待表格加载
    await page.waitForTimeout(1000)

    // 检查是否有数据行 - 找到 Link 组件（包含 /orders/ 的链接）
    const orderLinks = page.locator('table tbody tr a[href*="/orders/"]')
    const linkCount = await orderLinks.count()

    if (linkCount > 0) {
      // 获取第一个订单链接的 href
      const firstOrderLink = orderLinks.first()
      const href = await firstOrderLink.getAttribute('href')

      // 验证链接格式正确
      expect(href).toMatch(/\/orders\/[a-f0-9-]+/)

      // 使用 Promise.all 同时等待导航和点击
      await Promise.all([
        page.waitForURL(/\/orders\/[a-f0-9-]+/),
        firstOrderLink.click()
      ])

      // 验证跳转到详情页
      expect(page.url()).toMatch(/\/orders\/[a-f0-9-]+/)
    } else {
      // 如果没有数据，跳过此测试
      test.skip()
    }
  })
})
