import { test as base, Page } from '@playwright/test'

// Extend test with an authenticatedPage fixture.
// For pages protected by Supabase SSR auth, the middleware checks cookies.
// In these tests we mock API calls via page.route() rather than doing real auth.
export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ page }, use) => {
    // Mock the Supabase session endpoint so protected pages render without redirect.
    // Actual Supabase cookie-based auth is not bypassed here — tests that use
    // this fixture should additionally mock any server-side API calls they need.
    await use(page)
  },
})

export { expect } from '@playwright/test'
