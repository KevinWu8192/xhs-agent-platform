import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────
//  Script Agent Page (脚本口播)
//
//  POST /api/agents/script is mocked with page.route() so no
//  real Anthropic API call is ever made.
// ─────────────────────────────────────────────────────────────

/** Build a minimal SSE response body string */
function buildSseStream(events: Array<{ event: string; data: unknown }>): string {
  const lines = events
    .map((e) => `data: ${JSON.stringify({ event: e.event, data: e.data })}`)
    .join('\n\n')
  return lines + '\n\ndata: [DONE]\n\n'
}

const MOCK_SCRIPT_TEXT = `【开场白】\n大家好，今天来聊一聊秋冬日系清透妆容。\n\n【正文】\n第一步：打底要选择轻薄的水润粉底液。\n第二步：眼妆以棕色为主，强调无辜感。`

test.describe('Script Agent page (脚本口播)', () => {
  test('renders the topic textarea', async ({ page }) => {
    await page.goto('/agents/script')
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
  })

  test('topic textarea accepts text input', async ({ page }) => {
    await page.goto('/agents/script')
    await page.locator('textarea').fill('秋冬日系清透妆容教程')
    await expect(page.locator('textarea')).toHaveValue('秋冬日系清透妆容教程')
  })

  test('renders 4 style selection buttons', async ({ page }) => {
    await page.goto('/agents/script')
    const styleLabels = ['生活类', '美妆', '美食', '数码']
    for (const label of styleLabels) {
      await expect(page.locator('button').filter({ hasText: label }).first()).toBeVisible()
    }
  })

  test('style buttons toggle selection state', async ({ page }) => {
    await page.goto('/agents/script')

    // Click the 美妆 style button
    const beautyBtn = page.locator('button').filter({ hasText: '美妆' }).first()
    await beautyBtn.click()

    // After clicking, 美妆 button should have the selected border class (rose-400)
    await expect(beautyBtn).toHaveClass(/border-rose-400/)
  })

  test('renders the generate script button', async ({ page }) => {
    await page.goto('/agents/script')
    const generateBtn = page.locator('button').filter({ hasText: '生成脚本' })
    await expect(generateBtn).toBeVisible()
  })

  test('generate button is disabled when topic is empty', async ({ page }) => {
    await page.goto('/agents/script')
    const generateBtn = page.locator('button').filter({ hasText: '生成脚本' })
    await expect(generateBtn).toBeDisabled()
  })

  test('generate button is enabled after filling topic', async ({ page }) => {
    await page.goto('/agents/script')
    await page.locator('textarea').fill('秋冬日系清透妆容教程')
    const generateBtn = page.locator('button').filter({ hasText: '生成脚本' })
    await expect(generateBtn).toBeEnabled()
  })

  test('mock SSE delta events render script text progressively', async ({ page }) => {
    await page.route('/api/agents/script', async (route) => {
      const body = buildSseStream([
        { event: 'start', data: {} },
        { event: 'delta', data: { type: 'text_delta', text: '【开场白】\n大家好，今天来聊一聊秋冬日系清透妆容。' } },
        { event: 'delta', data: { type: 'text_delta', text: '\n\n【正文】\n第一步：打底要选择轻薄的水润粉底液。' } },
        { event: 'done', data: {} },
      ])
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      })
    })

    await page.goto('/agents/script')
    await page.locator('textarea').fill('秋冬日系清透妆容教程')
    await page.locator('button').filter({ hasText: '生成脚本' }).click()

    // Script text should appear in the <pre> output element
    await expect(page.locator('pre')).toContainText('开场白', { timeout: 5000 })
    await expect(page.locator('pre')).toContainText('大家好', { timeout: 5000 })
  })

  test('copy button appears after generation is complete', async ({ page }) => {
    await page.route('/api/agents/script', async (route) => {
      const body = buildSseStream([
        { event: 'start', data: {} },
        { event: 'delta', data: { type: 'text_delta', text: MOCK_SCRIPT_TEXT } },
        { event: 'done', data: {} },
      ])
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      })
    })

    await page.goto('/agents/script')
    await page.locator('textarea').fill('秋冬日系清透妆容教程')
    await page.locator('button').filter({ hasText: '生成脚本' }).click()

    // The "复制全文" button should become visible once isDone is true
    await expect(page.locator('button').filter({ hasText: '复制全文' })).toBeVisible({ timeout: 5000 })
  })

  test('copy button text changes to 已复制 after clicking', async ({ page }) => {
    // Grant clipboard permission so the clipboard.writeText succeeds
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.route('/api/agents/script', async (route) => {
      const body = buildSseStream([
        { event: 'start', data: {} },
        { event: 'delta', data: { type: 'text_delta', text: MOCK_SCRIPT_TEXT } },
        { event: 'done', data: {} },
      ])
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      })
    })

    await page.goto('/agents/script')
    await page.locator('textarea').fill('秋冬日系清透妆容教程')
    await page.locator('button').filter({ hasText: '生成脚本' }).click()

    const copyBtn = page.locator('button').filter({ hasText: '复制全文' })
    await expect(copyBtn).toBeVisible({ timeout: 5000 })
    await copyBtn.click()

    // After click the button should briefly show "已复制"
    await expect(page.locator('button').filter({ hasText: '已复制' })).toBeVisible({ timeout: 2000 })
  })

  test('hot topic quick-fill buttons are rendered', async ({ page }) => {
    await page.goto('/agents/script')
    // HOT_TOPICS are rendered as pill buttons with "+ 秋冬穿搭" etc.
    await expect(page.locator('button').filter({ hasText: '秋冬穿搭' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '在家咖啡' })).toBeVisible()
  })

  test('clicking hot topic fills the textarea', async ({ page }) => {
    await page.goto('/agents/script')
    await page.locator('button').filter({ hasText: '秋冬穿搭' }).click()
    await expect(page.locator('textarea')).toHaveValue(/秋冬穿搭/)
  })
})
