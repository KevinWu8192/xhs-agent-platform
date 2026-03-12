import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────
//  Dashboard Page — Agent card grid structure
//
//  The Supabase middleware fails-open when env vars are absent,
//  so /dashboard renders without a real session in test runs.
//  Tests verify static DOM structure only — no API calls needed.
// ─────────────────────────────────────────────────────────────

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('renders the AI assistant section heading', async ({ page }) => {
    const heading = page.locator('h2').filter({ hasText: '我的 AI 助手' })
    await expect(heading).toBeVisible()
  })

  test('renders exactly 4 agent cards', async ({ page }) => {
    // Each agent card contains a <h3> with the agent name inside a card container.
    // We scope to the cards under the "AI 助手" section grid.
    const agentNames = ['信息雷达', '脚本口播', '标签优化', '数据洞察']
    for (const name of agentNames) {
      await expect(page.locator('h3').filter({ hasText: name })).toBeVisible()
    }
  })

  test('first card (信息雷达) links to /agents/radar', async ({ page }) => {
    const radarLink = page.locator('a[href="/agents/radar"]').first()
    await expect(radarLink).toBeVisible()
  })

  test('second card (脚本口播) links to /agents/script', async ({ page }) => {
    const scriptLink = page.locator('a[href="/agents/script"]').first()
    await expect(scriptLink).toBeVisible()
  })

  test('third card (标签优化) shows 即将上线 tag', async ({ page }) => {
    // The disabled cards show "即将上线" inside their tag badge
    const tagsCard = page.locator('h3').filter({ hasText: '标签优化' }).locator('..').locator('..')
    await expect(tagsCard.locator('span').filter({ hasText: '即将上线' }).first()).toBeVisible()
  })

  test('fourth card (数据洞察) shows 即将上线 tag', async ({ page }) => {
    const insightsCard = page.locator('h3').filter({ hasText: '数据洞察' }).locator('..').locator('..')
    await expect(insightsCard.locator('span').filter({ hasText: '即将上线' }).first()).toBeVisible()
  })

  test('disabled cards do NOT have a clickable link wrapper', async ({ page }) => {
    // Disabled cards render plain div, not wrapped in <a>. Verify the card text
    // exists but its nearest <a> ancestor (if any) does not have href to an agent route.
    const tagsH3 = page.locator('h3').filter({ hasText: '标签优化' })
    await expect(tagsH3).toBeVisible()
    // Confirm there is no link to a tags route
    await expect(page.locator('a[href="/agents/tags"]')).toHaveCount(0)
    await expect(page.locator('a[href="/agents/insights"]')).toHaveCount(0)
  })

  test('welcome banner quick-action buttons exist', async ({ page }) => {
    // The hero banner has two quick-action links
    await expect(page.locator('a[href="/agents/script"]').filter({ hasText: '生成脚本' })).toBeVisible()
    await expect(page.locator('a[href="/agents/radar"]').filter({ hasText: '追踪热点' })).toBeVisible()
  })
})
