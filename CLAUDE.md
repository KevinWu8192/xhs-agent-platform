# XHS Agent Platform — Project Context

## 服务器
- **公网 IP**: 47.236.14.23
- **SSH**: `ssh -i ~/.ssh/id_rsa -p 22 kevin@47.236.14.23`
- **项目路径（服务器）**: `/home/kevin/xhs-agent-platform`
- **本地路径**: `~/code/xhs-agent-platform`

## Agent Team（.claude/agents/）
| Agent | 职责 |
|-------|------|
| `backend` | Next.js API routes, FastAPI, Supabase, MCP server |
| `frontend` | Next.js 14, React, Tailwind CSS |
| `xhs-agent` | 小红书爬虫, Playwright, fastmcp tools, session 管理 |
| `devops-agent` | SSH 部署, PM2, npm build, venv 管理 |
| `designer` | UI/UX, 组件视觉规范 |
| `qa` | Playwright 测试, 部署验证 |

**PM 原则**: Claude-feishu 是项目经理，不自己写代码，全部委托 subagent。

## 技术栈
- **前端**: Next.js 14 App Router + Tailwind CSS + TypeScript
- **后端**: Next.js API Routes + Supabase
- **AI**: @ai-sdk/anthropic + experimental_createMCPClient (Vercel AI SDK)
- **XHS 自动化**: fastmcp (Python) + Playwright + CDP
- **进程管理**: PM2

## PM2 进程（服务器）
| 进程名 | 端口 | 说明 |
|--------|------|------|
| `nextjs-app` | 3000 | Next.js 前端+API |
| `xhs-mcp-server` | 8000 | fastmcp SSE MCP server |
| `xhs-http-app` | 8001 | FastAPI HTTP（QR 登录） |

## 部署流程（devops-agent 执行）
```bash
ssh -i ~/.ssh/id_rsa -p 22 kevin@47.236.14.23
cd ~/xhs-agent-platform && git pull
export PATH=~/.nvm/versions/node/v24.14.0/bin:$PATH
npm install && npm run build
pm2 restart nextjs-app xhs-mcp-server xhs-http-app
```

## XHS 登录架构
1. 前端 banner 提示用户扫码
2. `GET /qr-reset` → 清除旧 session
3. `GET /qr-login?user_id=` → 启动 Chrome，返回 QR base64
4. 前端轮询 `GET /login-status?user_id=`
5. 登录成功后，radar route 通过 MCP SSE 调用 `search_feeds`

## Chrome 浏览器关键配置
- **Profile**: `~/.xhs/chrome-profile`（持久化，与 xiaohongshu-skills-main 共用）
- **CDP Port**: 9222
- **⚠️ 必须用持久化 profile**，否则 XHS 识别为机器人

## 当前待修复
- [ ] qr_login.py 需使用 `~/.xhs/chrome-profile` 而非空 profile
- [ ] 加 Edge 检测（`microsoft-edge`, `microsoft-edge-stable`）作为 Chrome 回退

## 注意事项
- macOS 编译的 Python venv 不能在 Linux 服务器运行
- 服务器 node 路径：`~/.nvm/versions/node/v24.14.0/bin/`
- xhs-scraper venv 在服务器上：`/home/kevin/xhs-agent-platform/xhs-scraper/venv/`
