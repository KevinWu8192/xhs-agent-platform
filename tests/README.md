# E2E Tests — XHS Agent Platform

Playwright E2E tests covering auth, dashboard, and agent pages.

## Test files

| File | Description | Test cases |
|---|---|---|
| `e2e/auth.spec.ts` | Login and register page UI | 9 |
| `e2e/dashboard.spec.ts` | Dashboard agent card grid | 7 |
| `e2e/radar-agent.spec.ts` | 信息雷达 search + SSE mock | 6 |
| `e2e/script-agent.spec.ts` | 脚本口播 generation + SSE mock | 10 |

## Running tests

### Prerequisites

1. Copy and fill in environment variables:
   ```bash
   cp .env.example .env.local
   # Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
   ```

2. Start the development server in one terminal:
   ```bash
   npm run dev
   ```

3. In another terminal, run the tests:
   ```bash
   npm test
   ```

### Other test commands

```bash
# Interactive UI mode
npm run test:ui

# Show last HTML report
npm run test:report

# Run a single spec file
npx playwright test tests/e2e/auth.spec.ts

# Run tests in headed mode (watch the browser)
npx playwright test --headed
```

## Notes

- Tests use `page.route()` to mock `POST /api/agents/radar` and `POST /api/agents/script`.
  No real Anthropic API calls are made during test runs.
- The Supabase middleware fails-open when env vars are absent, so protected routes
  (`/dashboard`, `/agents/*`) render without a real session in local test runs.
- Auth page tests (`/login`, `/register`) only test UI structure and client-side
  validation — no Supabase sign-in/sign-up requests are made.
