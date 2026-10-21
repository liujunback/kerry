import { expect, test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

test.describe('Manifest list selection UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('does not render row-selection checkboxes', async ({ page }) => {
    await page.goto('/manifest-orders')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('button[role="checkbox"]')).toHaveCount(0)
  })
})
