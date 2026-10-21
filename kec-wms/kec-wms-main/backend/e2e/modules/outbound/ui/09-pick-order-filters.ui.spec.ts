import { expect, test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

test.describe('Pick order advanced filter UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('create page expands advanced filters', async ({ page }) => {
    await page.goto('/pick-orders/create')
    await page.waitForLoadState('networkidle')

    const visibleInputsBefore = await page.locator('input:visible').count()
    const toggle = page.getByRole('button', { name: /更多筛选|More Filters/i })
    await expect(toggle).toBeVisible()
    await toggle.click()

    const visibleInputsAfter = await page.locator('input:visible').count()
    expect(visibleInputsAfter).toBeGreaterThan(visibleInputsBefore)
  })
})
