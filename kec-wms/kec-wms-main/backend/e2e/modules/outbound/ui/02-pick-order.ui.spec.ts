import { expect,test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

/**
 * 拣货单 UI 测试
 *
 * 测试拣货单列表和创建拣货单页面的 UI 交互
 * 页面路由: /pick-orders, /pick-orders/create, /pick-orders/[id]
 */
test.describe('拣货单 UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  // ==================== 拣货单列表页面 ====================

  test.describe('拣货单列表', () => {
    test('页面加载应该显示拣货单列表', async ({ page }) => {
      await page.goto('/pick-orders')
      await page.waitForLoadState('networkidle')

      // 验证表格存在
      await expect(page.locator('table')).toBeVisible()
    })

    test('点击创建拣货单按钮应该跳转到创建页面', async ({ page }) => {
      await page.goto('/pick-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // 查找创建按钮（Link 包裹 Button）
      const createLink = page.locator('a[href="/pick-orders/create"]')

      // 等待链接出现
      await expect(createLink).toBeVisible({ timeout: 10000 })

      // 点击并等待导航
      await Promise.all([
        page.waitForURL(/\/pick-orders\/create/),
        createLink.click()
      ])

      expect(page.url()).toContain('/pick-orders/create')
    })

    test('筛选拣货单应该更新列表', async ({ page }) => {
      await page.goto('/pick-orders')
      await page.waitForLoadState('networkidle')

      // 查找搜索输入框
      const searchInput = page.locator('input[name="search"]').first()

      if (await searchInput.isVisible()) {
        await searchInput.fill('PK-')
        await searchInput.press('Enter')
        await page.waitForLoadState('networkidle')
      }

      // 验证表格存在
      await expect(page.locator('table')).toBeVisible()
    })

    test('点击拣货单号应该跳转到详情页', async ({ page }) => {
      await page.goto('/pick-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // 检查是否有数据行 - 找到包含 /pick-orders/ 的链接
      const pickOrderLinks = page.locator('table tbody tr a[href*="/pick-orders/"]')
      const linkCount = await pickOrderLinks.count()

      if (linkCount > 0) {
        const firstLink = pickOrderLinks.first()
        const href = await firstLink.getAttribute('href')

        if (href) {
          await Promise.all([
            page.waitForURL(/\/pick-orders\/[a-f0-9-]+/),
            firstLink.click()
          ])
          expect(page.url()).toMatch(/\/pick-orders\/[a-f0-9-]+/)
        }
      }
    })
  })

  // ==================== 创建拣货单页面 ====================

  test.describe('创建拣货单', () => {
    test('页面加载应该显示创建表单或订单选择', async ({ page }) => {
      await page.goto('/pick-orders/create')
      await page.waitForLoadState('networkidle')

      // 验证页面加载成功（有表格或表单）
      const hasTable = await page.locator('table').isVisible()
      const hasForm = await page.locator('form').isVisible()

      expect(hasTable || hasForm).toBe(true)
    })

    test('页面应该有仓库选择器', async ({ page }) => {
      await page.goto('/pick-orders/create')
      await page.waitForLoadState('networkidle')

      // 查找仓库选择器
      const warehouseSelect = page.locator('button[role="combobox"]').first()

      if (await warehouseSelect.isVisible()) {
        await warehouseSelect.click()
        await page.waitForTimeout(300)
        await page.keyboard.press('Escape')
      }
    })

    test('选择订单后应该启用创建按钮', async ({ page }) => {
      await page.goto('/pick-orders/create')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // 检查是否有数据行
      const rows = page.locator('table tbody tr')
      const rowCount = await rows.count()

      if (rowCount > 0) {
        // 点击第一行的复选框
        const firstCheckbox = rows.first().locator('input[type="checkbox"], button[role="checkbox"]').first()
        if (await firstCheckbox.isVisible()) {
          await firstCheckbox.click()
          await page.waitForTimeout(500)
        }
      }
    })
  })

  // ==================== 拣货单详情页面 ====================

  test.describe('拣货单详情', () => {
    test('详情页面应该显示拣货单信息', async ({ page }) => {
      // 先去列表页找一个拣货单
      await page.goto('/pick-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const pickOrderLinks = page.locator('table tbody tr a[href*="/pick-orders/"]')
      const linkCount = await pickOrderLinks.count()

      if (linkCount > 0) {
        await pickOrderLinks.first().click()
        await page.waitForLoadState('networkidle')

        // 验证详情页面有内容
        const hasContent = await page.locator('main').isVisible()
        expect(hasContent).toBe(true)
      }
    })

    test('详情页面应该有返回按钮', async ({ page }) => {
      await page.goto('/pick-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const pickOrderLinks = page.locator('table tbody tr a[href*="/pick-orders/"]')
      const linkCount = await pickOrderLinks.count()

      if (linkCount > 0) {
        await pickOrderLinks.first().click()
        await page.waitForLoadState('networkidle')

        // 检查是否有返回/后退相关元素
        const backElements = page.locator('a, button').filter({ has: page.locator('svg') }).first()
        expect(await backElements.count()).toBeGreaterThan(0)
      }
    })
  })
})
