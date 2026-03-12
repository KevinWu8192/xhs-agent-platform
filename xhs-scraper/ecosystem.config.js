/**
 * ecosystem.config.js
 *
 * PM2 process configuration for the XHS Scraper MCP Service.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart xhs-scraper
 *   pm2 logs xhs-scraper
 *
 * The service runs on port 8000.  Xvfb must be running on display :99 so that
 * Chrome (launched by xiaohongshu-skills) can start in headless mode on
 * display-less servers.  Start Xvfb separately or add it as a PM2 app:
 *   Xvfb :99 -screen 0 1920x1080x24 &
 */

module.exports = {
  apps: [
    {
      name: 'xhs-scraper',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000 --workers 1',
      cwd: '/home/kevin/code/xhs-agent-platform/xhs-scraper',
      interpreter: 'python3',
      env: {
        PYTHONUNBUFFERED: '1',
        // Virtual display for headless Chrome on servers without a GPU/display.
        // Make sure `Xvfb :99 -screen 0 1920x1080x24 &` is running first.
        DISPLAY: ':99',
      },
      // Restart on crash but cap at 10 restarts in 1 minute
      max_restarts: 10,
      restart_delay: 3000,
      // Watch is disabled — reload manually with `pm2 restart xhs-scraper`
      watch: false,
      // Merge stdout/stderr into a single log stream
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
