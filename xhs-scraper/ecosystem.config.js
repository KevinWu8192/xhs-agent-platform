/**
 * ecosystem.config.js
 *
 * PM2 process configuration for the XHS Agent Platform scraper services.
 *
 * Two processes:
 *   xhs-mcp-server  — FastMCP SSE server (port 8000) — all 12 MCP tools
 *   xhs-http-app    — FastAPI HTTP server (port 8001) — QR login endpoints only
 *
 * Usage:
 *   pm2 start ecosystem.config.js          # start both processes
 *   pm2 restart xhs-mcp-server             # restart MCP server only
 *   pm2 restart xhs-http-app               # restart HTTP app only
 *   pm2 logs xhs-mcp-server                # tail MCP server logs
 *   pm2 logs xhs-http-app                  # tail HTTP app logs
 *   pm2 stop all                           # stop everything
 *
 * Prerequisites:
 *   1. Xvfb running on display :99 for headless Chrome:
 *        Xvfb :99 -screen 0 1920x1080x24 &
 *   2. Python deps installed in the xiaohongshu-skills venv:
 *        cd ~/.claude/skills/xiaohongshu-skills-main
 *        .venv/bin/python -m pip install fastmcp "fastapi>=0.104.0" "uvicorn[standard]" aiofiles python-multipart
 *
 * The MCP server uses the xiaohongshu-skills venv Python (Python 3.14) because
 * fastmcp requires Python >=3.10 and fastmcp/uvicorn are installed there.
 * Adjust VENV_PYTHON and VENV_BIN below if your venv path differs.
 */

// Path to the xiaohongshu-skills venv (contains fastmcp, uvicorn, fastapi)
const VENV_BIN = '/home/kevin/.claude/skills/xiaohongshu-skills-main/.venv/bin';

const CWD = '/home/kevin/code/xhs-agent-platform/xhs-scraper';

const COMMON_ENV = {
  PYTHONUNBUFFERED: '1',
  // Add venv bin to PATH so that `fastmcp` and `uvicorn` executables are found.
  PATH: `${VENV_BIN}:/usr/local/bin:/usr/bin:/bin`,
  // Virtual display for headless Chrome on servers without a GPU/display.
  // Make sure `Xvfb :99 -screen 0 1920x1080x24 &` is running first.
  DISPLAY: ':99',
};

module.exports = {
  apps: [
    // -----------------------------------------------------------------------
    // MCP Server — FastMCP SSE transport on port 8000
    // Exposes all 12 XHS tools to Claude and other MCP clients.
    //
    // MCP client config (e.g. Claude Desktop or claude_desktop_config.json):
    //   {
    //     "xhs": {
    //       "type": "sse",
    //       "url": "http://localhost:8000/sse/"
    //     }
    //   }
    // -----------------------------------------------------------------------
    {
      name: 'xhs-mcp-server',
      script: `${VENV_BIN}/fastmcp`,
      args: 'run server.py --transport sse --port 8000',
      cwd: CWD,
      interpreter: 'none',      // fastmcp is a Python script with a shebang
      env: COMMON_ENV,
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // -----------------------------------------------------------------------
    // HTTP App — FastAPI / uvicorn on port 8001
    // QR login endpoints consumed by the Next.js frontend QR modal.
    //
    // Frontend calls:
    //   GET http://localhost:8001/qr-login?user_id=<uid>
    //   GET http://localhost:8001/login-status?user_id=<uid>
    // -----------------------------------------------------------------------
    {
      name: 'xhs-http-app',
      script: `${VENV_BIN}/uvicorn`,
      args: 'http_app:app --host 0.0.0.0 --port 8001 --workers 1',
      cwd: CWD,
      interpreter: 'none',      // uvicorn is a Python script with a shebang
      env: COMMON_ENV,
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
