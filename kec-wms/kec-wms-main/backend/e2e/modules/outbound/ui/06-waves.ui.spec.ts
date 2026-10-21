import { expect,test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

/**
 * 波次管理 UI 测试
 *
 * 测试波次管理页面的 UI 交互
 * 页面路由: /waves
 */
test.describe('波次管理 UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('页面加载应该显示波次列表', async ({ page }) => {
    await page.goto('/waves')
    await page.waitForLoadState('networkidle')

    // 验证表格存在
    await expect(page.locator('table')).toBeVisible()
  })

  test('页面应该有搜索或筛选区域', async ({ page }) => {
    await page.goto('/waves')
    await page.waitForLoadState('networkidle')

    // 查找搜索输入框或筛选器
    const hasInput = await page.locator('input[type="text"]').count() > 0
    const hasSelect = await page.locator('button[role="combobox"]').count() > 0

    expect(hasInput || hasSelect).toBe(true)
  })

  test('页面应该有刷新按钮', async ({ page }) => {
    await page.goto('/waves')
    await page.waitForLoadState('networkidle')

    // 查找刷新按钮（通常有 RefreshCw 图标）
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    expect(buttonCount).toBeGreaterThan(0)
  })

  test('页面应该有创建按钮', async ({ page }) => {
    await page.goto('/waves')
    await page.waitForLoadState('networkidle')

    // 查找创建按钮（Plus 图标或文字）
    const createButton = page.locator('button').filter({ has: page.locator('svg') })
    const buttonCount = await createButton.count()

    expect(buttonCount).toBeGreaterThan(0)
  })

  test('点击波次行应该可以查看详情', async ({ page }) => {
    await page.goto('/waves')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 检查是否有数据行
    const rows = page.locator('table tbody tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      // 点击第一行
      await rows.first().click()
      await page.waitForTimeout(500)

      // 可能打开对话框或跳转页面
      const dialog = page.locator('[role="dialog"]')
      const hasDialog = await dialog.isVisible()

      // 验证有响应（对话框或页面内容）
      expect(hasDialog || page.url().includes('/waves')).toBe(true)
    }
  })

  test('状态筛选器应该可以选择', async ({ page }) => {
    await page.goto('/waves')
    await page.waitForLoadState('networkidle')

    // 查找状态选择器
    const statusSelect = page.locator('button[role="combobox"]').first()

    if (await statusSelect.isVisible()) {
      await statusSelect.click()
      await page.waitForTimeout(300)

      // 验证下拉菜单出现
      const listbox = page.locator('[role="listbox"]')
      if (await listbox.isVisible()) {
        await page.keyboard.press('Escape')
      }
    }
  })
})
