# 🌸 XHS 博主助手平台

> 帮助小红书博主高效工作的 AI Agent 平台

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KevinWu8192/xhs-agent-platform)

## 功能

| Agent | 说明 |
|-------|------|
| 📡 **信息雷达** | 搜索 XHS 热门内容，AI 分析趋势和竞品 |
| ✍️ **脚本口播** | 输入话题，流式生成视频脚本和口播文案 |
| 🏷️ 标签优化 | *(即将上线)* 智能推荐标签组合 |
| 📈 数据洞察 | *(即将上线)* 账号数据分析和涨粉策略 |

## 技术栈

- **框架**: Next.js 14 (App Router)
- **认证**: Supabase Auth (邮箱 + Google OAuth)
- **数据库**: Supabase PostgreSQL (with RLS)
- **AI**: Anthropic Claude claude-sonnet-4-6 (SSE 流式)
- **样式**: Tailwind CSS (小红书粉红主题)
- **部署**: Vercel

## 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/KevinWu8192/xhs-agent-platform.git
cd xhs-agent-platform
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

填写 `.env.local`（见下方说明）。

### 3. 创建 Supabase 项目

1. 前往 [supabase.com](https://supabase.com) 创建新项目
2. 在 **SQL Editor** 中执行 `supabase/migrations/001_initial_schema.sql`
3. 在 **Authentication > Providers** 中启用 Google OAuth（可选）
4. 将 **Settings > API** 中的 URL 和 Keys 填入 `.env.local`

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公开 Key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色 Key（保密） | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic API Key | ✅ |

## 部署到 Vercel

### 方式一：一键部署（推荐）

点击上方 **Deploy with Vercel** 按钮，填写环境变量即可。

### 方式二：CLI 部署

```bash
npx vercel --prod
```

在 Vercel 控制台 **Settings > Environment Variables** 配置上表中的 4 个变量。

**重要**: 在 Supabase **Authentication > URL Configuration** 中添加：
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback`

## 信息雷达真实数据（可选）

信息雷达默认使用 Mock 数据。如需真实 XHS 数据，需本地运行 CDP 自动化：

```bash
cd ~/.claude/skills/xiaohongshu-skills-main
python scripts/chrome_launcher.py   # 启动 Chrome
python scripts/cli.py login          # 登录 XHS
```

登录后重启 dev server，信息雷达将自动使用真实数据。

## 项目结构

```
app/
├── (auth)/          # 登录/注册页
├── (app)/           # 需认证的页面
│   ├── dashboard/   # Agent 选择中心
│   └── agents/
│       ├── radar/   # 信息雷达
│       └── script/  # 脚本口播
├── api/             # API 路由
│   ├── agents/      # Agent SSE 流式 API
│   └── conversations/
components/          # React 组件
lib/                 # 工具函数、Supabase、Claude client
types/               # TypeScript 类型
supabase/migrations/ # 数据库迁移
tests/e2e/           # Playwright E2E 测试
```

## 开发团队

由 PM-Claude 调度 5 个专项 AI Agent 协作完成：
🎨 Designer · 💻 Frontend · ⚙️ Backend · 📱 XHS · 🧪 QA
