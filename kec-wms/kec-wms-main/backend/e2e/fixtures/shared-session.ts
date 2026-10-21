import { test as base, type BrowserContext, expect, type Page } from '@playwright/test'
import { loginAsAdmin } from './auth-helpers'

type SharedTestFixtures = {
  sharedPage: Page
}

type SharedWorkerFixtures = {
  sharedContext: BrowserContext
}

export const test = base.extend<SharedTestFixtures, SharedWorkerFixtures>({
  sharedContext: [async ({ browser }, finishFixture) => {
    const context = await browser.newContext({
      storageState: undefined,
    })

    await finishFixture(context)
    await context.close()
  }, { scope: 'worker' }],

  sharedPage: async ({ sharedContext }, finishFixture) => {
    const page = await sharedContext.newPage()

    console.log('Performing one-time login for shared session...')
    await loginAsAdmin(page)
    console.log('Shared session established')

    await finishFixture(page)
    await page.close()
  },
})

export { expect }
