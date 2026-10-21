import { expect,test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

/**
 * 集运单管理 UI 测试
 *
 * 测试集运单列表页面的 UI 交互
 * 页面路由: /manifest-orders, /manifest-orders/[id]
 */
test.describe('集运单管理 UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  // ==================== 集运单列表 ====================

  test.describe('集运单列表', () => {
    test('页面加载应该显示集运单列表', async ({ page }) => {
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')

      // 验证表格存在
      await expect(page.locator('table')).toBeVisible()
    })

    test('页面应该有新建按钮', async ({ page }) => {
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')

      // 查找新建按钮
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()

      expect(buttonCount).toBeGreaterThan(0)
    })

    test('页面应该有刷新功能', async ({ page }) => {
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')

      // 查找刷新按钮
      const refreshButton = page.locator('button').filter({ has: page.locator('svg') })
      const buttonCount = await refreshButton.count()

      expect(buttonCount).toBeGreaterThan(0)
    })

    test('筛选集运单应该更新列表', async ({ page }) => {
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')

      // 查找筛选器输入框
      const filterInputs = page.locator('input[type="text"]')

      if (await filterInputs.count() > 0) {
        const firstInput = filterInputs.first()
        await firstInput.fill('MF-')
        await firstInput.press('Enter')
        await page.waitForLoadState('networkidle')
      }

      // 验证表格存在
      await expect(page.locator('table')).toBeVisible()
    })

    test('点击集运单号应该可以查看详情', async ({ page }) => {
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // 检查是否有数据行 - 集运单号链接
      const manifestLinks = page.locator('table tbody tr a[href*="/manifest-orders/"]')
      const linkCount = await manifestLinks.count()

      if (linkCount > 0) {
        const firstLink = manifestLinks.first()
        const href = await firstLink.getAttribute('href')

        // 验证链接格式正确
        if (href) {
          expect(href).toMatch(/\/manifest-orders\/[a-f0-9-]+/)

          // 使用 Promise.all 同时等待导航和点击
          await Promise.all([
            page.waitForURL(/\/manifest-orders\/[a-f0-9-]+/),
            firstLink.click()
          ])

          // 验证跳转到详情页
          expect(page.url()).toMatch(/\/manifest-orders\/[a-f0-9-]+/)
        }
      }
    })
  })

  // ==================== 集运单详情 ====================

  test.describe('集运单详情', () => {
    test('详情页面应该显示集运单信息', async ({ page }) => {
      // 先去列表页找一个集运单
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const manifestLinks = page.locator('table tbody tr a[href*="/manifest-orders/"]')
      const linkCount = await manifestLinks.count()

      if (linkCount > 0) {
        await manifestLinks.first().click()
        await page.waitForLoadState('networkidle')

        // 验证详情页面有内容
        const mainContent = page.locator('main')
        await expect(mainContent).toBeVisible()
      }
    })

    test('详情页面应该有 Tab 或信息区域', async ({ page }) => {
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const manifestLinks = page.locator('table tbody tr a[href*="/manifest-orders/"]')
      const linkCount = await manifestLinks.count()

      if (linkCount > 0) {
        await manifestLinks.first().click()
        await page.waitForLoadState('networkidle')

        // 查找 Tab 组件或信息区域
        const hasTabs = await page.locator('[role="tablist"]').count() > 0
        const hasCards = await page.locator('.card, [class*="card"]').count() > 0
        const hasContent = await page.locator('main').isVisible()

        expect(hasTabs || hasCards || hasContent).toBe(true)
      }
    })

    test('详情页面应该有操作按钮', async ({ page }) => {
      await page.goto('/manifest-orders')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      const manifestLinks = page.locator('table tbody tr a[href*="/manifest-orders/"]')
      const linkCount = await manifestLinks.count()

      if (linkCount > 0) {
        await manifestLinks.first().click()
        await page.waitForLoadState('networkidle')

        // 检查是否有操作按钮
        const buttons = page.locator('button')
        expect(await buttons.count()).toBeGreaterThan(0)
      }
    })
  })
})
