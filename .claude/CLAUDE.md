# XHS博主助手平台 — 项目指南

## 项目概述
帮助小红书博主高效工作的 AI Agent 平台。

- **托管**: Vercel
- **认证**: Supabase Auth
- **UI风格**: 小红书粉红活泼风
- **GitHub**: https://github.com/KevinWu8192/xhs-agent-platform

## Tech Stack
- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase (Auth + PostgreSQL)
- Claude API (Anthropic)
- Vercel (deployment)

## Agent Team

| Agent | 文件 | 职责 |
|-------|------|------|
| designer | `.claude/agents/designer.md` | UI/UX设计、组件规范 |
| frontend | `.claude/agents/frontend.md` | Next.js开发、页面实现 |
| backend | `.claude/agents/backend.md` | API路由、数据库、AI集成 |
| xhs-agent | `.claude/agents/xhs-agent.md` | 小红书数据采集 |
| qa | `.claude/agents/qa.md` | 测试、部署验证 |

## Milestones
- [x] M0: Agent Team 创建
- [ ] M1: 设计系统 & 架构决策
- [ ] M2: 项目骨架 & Supabase认证
- [ ] M3: Dashboard & Agent选择中心
- [ ] M4: 信息雷达 + 脚本口播实现
- [ ] M5: 测试 & Vercel部署

## Commands
```bash
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run type-check # TypeScript检查
npx playwright test # E2E测试
```

## Key Directories
```
app/           # Next.js pages & API routes
components/    # React components
lib/           # Utilities, Supabase client
tests/         # Playwright E2E tests
```
