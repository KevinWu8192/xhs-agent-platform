# XHS Scraper — FastAPI MCP Service

A lightweight FastAPI server that wraps the [xiaohongshu-skills](~/.claude/skills/xiaohongshu-skills-main/) CLI into MCP-compatible HTTP tools.

The Next.js app (port 3000) calls this service at `http://localhost:8000` to perform XHS searches and manage per-user login sessions.

---

## Architecture

```
Next.js (port 3000)
    │  POST /tools/call
    ▼
FastAPI MCP Service (port 8000)   ← this service
    │  subprocess
    ▼
xiaohongshu-skills CLI (cli.py)
    │  CDP / WebDriver
    ▼
Chrome (per-user named profile)
    │  HTTPS
    ▼
www.xiaohongshu.com
```

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_qr_code` | Start login flow for a user; returns base64 QR PNG |
| `check_login_status` | Poll until `logged_in`; statuses: `not_started / pending / logged_in / expired` |
| `search_xhs` | Search XHS notes by keyword; returns list of XHSNote objects |
| `get_note_detail` | Get full detail of a note by ID + xsec_token |

---

## HTTP API

### `GET /health`
Returns `{"status": "ok", "service": "xhs-scraper", "version": "1.0.0"}`.

### `GET /tools/list`
Returns the full MCP tool schema.

### `POST /tools/call`

```json
{
  "tool": "search_xhs",
  "params": {
    "user_id": "<supabase-user-id>",
    "keyword": "护肤",
    "limit": 10,
    "sort_by": "综合"
  }
}
```

Response:
```json
{
  "success": true,
  "tool": "search_xhs",
  "result": {
    "notes": [...],
    "total": 20,
    "keyword": "护肤"
  },
  "duration_ms": 3241.5
}
```

---

## Session Management

Each user gets an **isolated Chrome profile** managed by xiaohongshu-skills' `account_manager`.  Session state is persisted in `~/.xhs_sessions/<user_id>.json`.

- Session TTL: 7 days after last successful login
- Port allocation: delegated to `account_manager` (auto-increments from 9222)
- Login is QR-code based; a background async task (`wait-login`) polls Chrome for scan completion

---

## Setup

### 1. Install dependencies

```bash
cd ~/code/xhs-agent-platform/xhs-scraper
pip install -r requirements.txt
```

### 2. Ensure xiaohongshu-skills is installed

```bash
cd ~/.claude/skills/xiaohongshu-skills-main
pip install -e .
```

### 3. Start Xvfb (servers without a display)

```bash
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
```

### 4. Start the service

**Development:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Production (PM2):**
```bash
pm2 start ecosystem.config.js
```

---

## File Structure

```
xhs-scraper/
├── main.py              # FastAPI app + HTTP routes
├── mcp_server.py        # MCP tool registry + dispatcher
├── session_manager.py   # Per-user session state + account lifecycle
├── tools/
│   ├── __init__.py
│   ├── qr_login.py      # get_qr_code + check_login_status tools
│   └── search.py        # search_xhs + get_note_detail tools
├── requirements.txt
├── ecosystem.config.js  # PM2 config
└── README.md
```

---

## CLI Commands Available in xiaohongshu-skills

The CLI (`scripts/cli.py`) supports the following subcommands relevant to this service:

| Command | Description |
|---------|-------------|
| `check-login` | Check login status; also returns QR code if not logged in |
| `get-qrcode` | Get QR code PNG non-blocking; Chrome tab stays open |
| `wait-login` | Block until QR is scanned (up to `--timeout` seconds) |
| `send-code` | Step 1 of phone login: send SMS code |
| `verify-code` | Step 2 of phone login: submit code |
| `search-feeds` | Search notes by keyword with filters |
| `get-feed-detail` | Get full note detail by ID + xsec_token |
| `add-account` | Register a named Chrome profile |
| `list-accounts` | List all accounts |

---

## Known Limitations

1. **Blocking CLI calls** — the tools invoke cli.py via `subprocess.run`, which blocks the async thread pool.  For high concurrency, consider running each CLI call in a `ProcessPoolExecutor`.
2. **Chrome startup time** — first call for a new user may take 5-15 seconds while Chrome initialises its profile.
3. **QR code expiry** — XHS QR codes expire in ~3 minutes.  If `wait-login` times out, call `get_qr_code` again to refresh.
4. **No publish_date in search results** — the CLI `search-feeds` output does not include a publication date; `published_at` is set to the current timestamp.
5. **Xvfb required on headless servers** — xiaohongshu-skills Chrome launcher auto-detects `DISPLAY`; if unset it falls back to headless Chromium mode, but `DISPLAY=:99` with Xvfb is more reliable.
