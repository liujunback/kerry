import { expect, test } from '@playwright/test'
import { loginAsAdmin } from '../../../fixtures/auth-helpers'

test.describe('ASN list UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('shows filters and table', async ({ page }) => {
    await page.goto('/asn')
    await page.waitForLoadState('networkidle')

    const filterForm = page.locator('form').first()
    await expect(page.locator('table')).toBeVisible()
    await expect(filterForm.locator('input').first()).toBeVisible()
    await expect(filterForm.locator('button[type="submit"]').first()).toBeVisible()
  })

  test('expands advanced filters', async ({ page }) => {
    await page.goto('/asn')
    await page.waitForLoadState('networkidle')

    const visibleComboboxesBefore = await page.locator('button[role="combobox"]:visible').count()
    const toggle = page.getByRole('button', { name: /更多筛选|More Filters/i })
    await expect(toggle).toBeVisible()
    await toggle.click()

    const visibleComboboxesAfter = await page.locator('button[role="combobox"]:visible').count()
    expect(visibleComboboxesAfter).toBeGreaterThan(visibleComboboxesBefore)
  })

  test('does not render row-selection checkboxes', async ({ page }) => {
    await page.goto('/asn')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('button[role="checkbox"]')).toHaveCount(0)
  })
})
