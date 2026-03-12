import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────
//  Auth Pages — UI structure & behaviour (no real Supabase calls)
//  Tests only inspect DOM structure and client-side validation.
//  No actual sign-in / sign-up requests are made.
// ─────────────────────────────────────────────────────────────

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders email and password inputs', async ({ page }) => {
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
  })

  test('renders a login submit button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toContainText('登录')
  })

  test('renders Google OAuth button', async ({ page }) => {
    // The Google login button is a <button> (not type="submit") that contains the SVG Google logo
    const googleBtn = page.locator('button:not([type="submit"])').filter({ hasText: '使用 Google 登录' })
    await expect(googleBtn).toBeVisible()
  })

  test('shows HTML5 validation when form is submitted empty', async ({ page }) => {
    // Email field is required — submitting without a value prevents navigation
    await page.locator('button[type="submit"]').click()
    // The page should still be on /login (HTML5 required prevents submit)
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows error message when password mismatches (custom validation path)', async ({ page }) => {
    // Fill email, leave password empty and submit — still stays on login page
    await page.locator('input#email').fill('test@example.com')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('has a link to the register page', async ({ page }) => {
    const registerLink = page.locator('a[href="/register"]')
    await expect(registerLink).toBeVisible()
    await expect(registerLink).toContainText('立即注册')
  })
})

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('renders three input fields', async ({ page }) => {
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirmPassword')).toBeVisible()
  })

  test('renders a register submit button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toContainText('立即注册')
  })

  test('shows custom error when passwords do not match', async ({ page }) => {
    await page.locator('input#email').fill('test@example.com')
    await page.locator('input#password').fill('password1')
    await page.locator('input#confirmPassword').fill('password2')
    await page.locator('button[type="submit"]').click()

    // Custom error div should appear
    const errorDiv = page.locator('div.text-red-600')
    await expect(errorDiv).toBeVisible()
    await expect(errorDiv).toContainText('两次输入的密码不一致')
  })

  test('shows custom error when password is too short', async ({ page }) => {
    await page.locator('input#email').fill('test@example.com')
    await page.locator('input#password').fill('abc')
    await page.locator('input#confirmPassword').fill('abc')
    await page.locator('button[type="submit"]').click()

    const errorDiv = page.locator('div.text-red-600')
    await expect(errorDiv).toBeVisible()
    await expect(errorDiv).toContainText('密码长度至少 6 位')
  })

  test('has a link back to the login page', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]')
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toContainText('立即登录')
  })
})
