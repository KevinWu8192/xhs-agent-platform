import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────
//  Radar Agent Page (信息雷达)
//
//  POST /api/agents/radar is mocked with page.route() to return
//  a pre-built SSE stream so no real Anthropic/search API is called.
// ─────────────────────────────────────────────────────────────

/** Build a minimal SSE response body string */
function buildSseStream(events: Array<{ event: string; data: unknown }>): string {
  const lines = events
    .map((e) => `data: ${JSON.stringify({ event: e.event, data: e.data })}`)
    .join('\n\n')
  return lines + '\n\ndata: [DONE]\n\n'
}

const MOCK_NOTES = [
  {
    id: 'note-1',
    title: '秋冬穿搭灵感合集',
    author: 'fashion_user',
    note_url: 'https://example.com/note-1',
    cover_image_url: null,
    likes: 1200,
    comments: 45,
    tags: ['穿搭', '秋冬'],
    published_at: '2024-11-01T10:00:00Z',
  },
  {
    id: 'note-2',
    title: '今年最流行的毛衣款式',
    author: 'style_blogger',
    note_url: 'https://example.com/note-2',
    cover_image_url: null,
    likes: 800,
    comments: 32,
    tags: ['毛衣', '流行'],
    published_at: '2024-11-02T10:00:00Z',
  },
]

const MOCK_INSIGHTS = '今年秋冬穿搭趋势以简约日系为主，大地色系最受欢迎。'

test.describe('Radar Agent page (信息雷达)', () => {
  test('renders the search input field', async ({ page }) => {
    await page.goto('/agents/radar')
    const searchInput = page.locator('input[type="text"]')
    await expect(searchInput).toBeVisible()
  })

  test('search input accepts text input', async ({ page }) => {
    await page.goto('/agents/radar')
    const searchInput = page.locator('input[type="text"]')
    await searchInput.fill('秋冬穿搭')
    await expect(searchInput).toHaveValue('秋冬穿搭')
  })

  test('search button is visible', async ({ page }) => {
    await page.goto('/agents/radar')
    const searchBtn = page.locator('button').filter({ hasText: '搜索' })
    await expect(searchBtn).toBeVisible()
  })

  test('clicking search triggers POST /api/agents/radar', async ({ page }) => {
    let requestCalled = false

    // Mock the API before navigating
    await page.route('/api/agents/radar', async (route) => {
      requestCalled = true
      const body = buildSseStream([
        { event: 'start', data: {} },
        { event: 'notes', data: MOCK_NOTES },
        { event: 'delta', data: { type: 'text_delta', text: MOCK_INSIGHTS } },
        { event: 'done', data: {} },
      ])
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      })
    })

    await page.goto('/agents/radar')
    await page.locator('input[type="text"]').fill('秋冬穿搭')
    await page.locator('button').filter({ hasText: '搜索' }).click()

    // Wait briefly for the request handler to fire
    await page.waitForTimeout(300)
    expect(requestCalled).toBe(true)
  })

  test('note cards are rendered after mock SSE returns notes', async ({ page }) => {
    await page.route('/api/agents/radar', async (route) => {
      const body = buildSseStream([
        { event: 'start', data: {} },
        { event: 'notes', data: MOCK_NOTES },
        { event: 'done', data: {} },
      ])
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      })
    })

    await page.goto('/agents/radar')
    await page.locator('input[type="text"]').fill('秋冬穿搭')
    await page.locator('button').filter({ hasText: '搜索' }).click()

    // Note card titles should appear
    await expect(page.locator('h3').filter({ hasText: '秋冬穿搭灵感合集' })).toBeVisible({ timeout: 5000 })
    await expect(page.locator('h3').filter({ hasText: '今年最流行的毛衣款式' })).toBeVisible({ timeout: 5000 })
  })

  test('AI insights text is displayed after mock SSE returns delta', async ({ page }) => {
    await page.route('/api/agents/radar', async (route) => {
      const body = buildSseStream([
        { event: 'start', data: {} },
        { event: 'notes', data: MOCK_NOTES },
        { event: 'delta', data: { type: 'text_delta', text: MOCK_INSIGHTS } },
        { event: 'done', data: {} },
      ])
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      })
    })

    await page.goto('/agents/radar')
    await page.locator('input[type="text"]').fill('秋冬穿搭')
    await page.locator('button').filter({ hasText: '搜索' }).click()

    // The insights text should eventually appear in the AI 深度洞察 panel
    await expect(page.locator('text=今年秋冬穿搭趋势以简约日系为主')).toBeVisible({ timeout: 5000 })
  })

  test('platform filter buttons are rendered', async ({ page }) => {
    await page.goto('/agents/radar')
    const platforms = ['全部平台', '小红书', '微博', '抖音', 'B站']
    for (const platform of platforms) {
      await expect(page.locator('button').filter({ hasText: platform }).first()).toBeVisible()
    }
  })

  test('pressing Enter in search input triggers search', async ({ page }) => {
    let requestCalled = false
    await page.route('/api/agents/radar', async (route) => {
      requestCalled = true
      const body = buildSseStream([{ event: 'done', data: {} }])
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      })
    })

    await page.goto('/agents/radar')
    await page.locator('input[type="text"]').fill('日系妆容')
    await page.locator('input[type="text"]').press('Enter')

    await page.waitForTimeout(300)
    expect(requestCalled).toBe(true)
  })
})
