import { expect, test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

test.describe('Outbound orders filter UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('expands advanced filters', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('networkidle')

    const filterForm = page.locator('form').first()
    const toggle = page.getByRole('button', { name: /更多筛选|More Filters/i })
    await expect(toggle).toBeVisible()
    await toggle.click()

    await expect(filterForm.getByText(/订单来源|Order Source/i).first()).toBeVisible()
    await expect(filterForm.getByText(/客户|Client/i).first()).toBeVisible()
  })
})
