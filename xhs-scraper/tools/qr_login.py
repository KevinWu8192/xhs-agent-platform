"""
tools/qr_login.py

MCP tools for QR-code-based XHS login.

Login flow (two-step, non-blocking):
  1. get_qr_code(user_id)   — starts Chrome for the user's account, fetches
                              the XHS login QR code, returns it as base64 PNG.
  2. check_login_status(user_id) — polls session state; call repeatedly until
                              status == "logged_in".

The underlying CLI commands used:
  cli.py --account <name> get-qrcode   → {qrcode_path, qrcode_image_url, ...}
  cli.py --account <name> wait-login   → {logged_in: bool, message: str}
  cli.py --account <name> check-login  → {logged_in: bool, ...}

wait-login is run as a background subprocess with a short timeout so the HTTP
request returns quickly; the caller should poll check_login_status.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Any

from session_manager import (
    XHS_SKILLS_DIR,
    CLI_SCRIPT,
    account_name,
    ensure_account_exists,
    get_status,
    is_logged_in,
    set_logged_in,
    set_pending,
)

logger = logging.getLogger("xhs.tools.qr_login")

# Timeout passed to cli.py wait-login (seconds).
# We use a relatively long value because the user needs time to scan.
WAIT_LOGIN_TIMEOUT = 120


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_cli(*args: str, timeout: int = 60) -> dict[str, Any]:
    """Run cli.py synchronously and return parsed JSON output."""
    cmd = ["python3", str(CLI_SCRIPT), *args]
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    # Headless Chrome needs Xvfb on display-less servers.
    if "DISPLAY" not in env:
        env["DISPLAY"] = ":99"

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(XHS_SKILLS_DIR),
            env=env,
        )
        raw = result.stdout.strip()
        if not raw:
            return {"error": result.stderr.strip() or "empty CLI output", "exit_code": result.returncode}
        # CLI may emit logging lines before the final JSON — grab the last
        # complete JSON object from stdout.
        last_json = _extract_last_json(raw)
        return last_json
    except subprocess.TimeoutExpired:
        return {"error": f"CLI timed out after {timeout}s"}
    except Exception as exc:
        logger.exception("CLI call failed")
        return {"error": str(exc)}


def _extract_last_json(text: str) -> dict[str, Any]:
    """Find and return the last valid JSON object in *text*.

    The CLI may print log lines before the JSON payload, so we scan lines in
    reverse looking for a line that starts a JSON object.
    """
    lines = text.splitlines()
    # Try to parse progressively longer tail slices
    for i in range(len(lines) - 1, -1, -1):
        candidate = "\n".join(lines[i:])
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    # Last resort: try the whole thing
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text, "error": "failed to parse CLI JSON output"}


def _read_qr_file_as_base64(path: str) -> str | None:
    """Read a QR code PNG file from disk and return base64-encoded string."""
    try:
        data = Path(path).read_bytes()
        return base64.b64encode(data).decode("ascii")
    except Exception as exc:
        logger.warning("Could not read QR file %s: %s", path, exc)
        return None


# ---------------------------------------------------------------------------
# Background wait-login task
# ---------------------------------------------------------------------------

# Maps user_id -> asyncio.Task for the background wait-login subprocess.
_wait_tasks: dict[str, asyncio.Task] = {}  # type: ignore[type-arg]


async def _background_wait_login(user_id: str, acct: str) -> None:
    """Run wait-login in the background and update session on success."""
    logger.info("Starting background wait-login for %s (account=%s)", user_id, acct)
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    if "DISPLAY" not in env:
        env["DISPLAY"] = ":99"
    try:
        proc = await asyncio.create_subprocess_exec(
            "python3",
            str(CLI_SCRIPT),
            "--account", acct,
            "wait-login",
            "--timeout", str(WAIT_LOGIN_TIMEOUT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(XHS_SKILLS_DIR),
            env=env,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=WAIT_LOGIN_TIMEOUT + 10)
        raw = stdout.decode("utf-8", errors="replace").strip()
        data = _extract_last_json(raw)
        if data.get("logged_in"):
            set_logged_in(user_id)
            logger.info("Background wait-login succeeded for %s", user_id)
        else:
            logger.warning("Background wait-login failed for %s: %s", user_id, data)
    except asyncio.TimeoutError:
        logger.warning("Background wait-login timed out for %s", user_id)
    except Exception as exc:
        logger.exception("Background wait-login error for %s: %s", user_id, exc)
    finally:
        _wait_tasks.pop(user_id, None)


def _schedule_wait_login(user_id: str, acct: str) -> None:
    """Schedule the background wait-login coroutine if not already running."""
    if user_id in _wait_tasks and not _wait_tasks[user_id].done():
        logger.debug("wait-login already running for %s", user_id)
        return
    try:
        loop = asyncio.get_event_loop()
        task = loop.create_task(_background_wait_login(user_id, acct))
        _wait_tasks[user_id] = task
    except RuntimeError:
        # No running event loop (e.g. during testing) — skip background task
        logger.warning("No event loop; background wait-login not started for %s", user_id)


# ---------------------------------------------------------------------------
# MCP Tool: get_qr_code
# ---------------------------------------------------------------------------

async def get_qr_code(user_id: str) -> dict[str, Any]:
    """
    MCP tool: get_qr_code

    Returns the XHS login QR code for *user_id* as a base64-encoded PNG.

    If the user already has a valid session the tool returns immediately with
    status "already_logged_in" — the caller need not show a QR code.

    Returns:
        {"status": "already_logged_in"}
        {"status": "qr_ready", "qr_image_base64": "...", "qr_login_url": "...", "session_id": "..."}
        {"status": "error", "message": "..."}
    """
    # Fast path: already logged in
    if is_logged_in(user_id):
        return {"status": "already_logged_in"}

    acct = ensure_account_exists(user_id)

    # Run get-qrcode (non-blocking CLI call)
    data = _run_cli("--account", acct, "get-qrcode", timeout=60)

    # Already logged in (browser reports it)
    if data.get("logged_in") is True or data.get("logged_in") == "true":
        set_logged_in(user_id)
        return {"status": "already_logged_in"}

    if "error" in data and "qrcode_path" not in data:
        return {"status": "error", "message": data["error"]}

    qr_path: str | None = data.get("qrcode_path")
    qr_image_url: str | None = data.get("qrcode_image_url")
    qr_login_url: str | None = data.get("qr_login_url")

    # Convert QR file to base64 for inline embedding
    qr_b64: str | None = None
    if qr_path:
        qr_b64 = _read_qr_file_as_base64(qr_path)

    # If we still have no base64 but have an image URL, tell the caller to use the URL
    if not qr_b64 and not qr_image_url:
        return {
            "status": "error",
            "message": "QR code could not be retrieved — Chrome may not be running or login failed",
        }

    # Mark session as pending and start background wait-login
    set_pending(user_id)
    _schedule_wait_login(user_id, acct)

    result: dict[str, Any] = {
        "status": "qr_ready",
        "session_id": acct,
    }
    if qr_b64:
        result["qr_image_base64"] = qr_b64
    if qr_image_url:
        result["qr_image_url"] = qr_image_url
    if qr_login_url:
        result["qr_login_url"] = qr_login_url
    if qr_path:
        result["qr_file_path"] = qr_path

    return result


# ---------------------------------------------------------------------------
# MCP Tool: check_login_status
# ---------------------------------------------------------------------------

async def check_login_status(user_id: str) -> dict[str, Any]:
    """
    MCP tool: check_login_status

    Returns the current login status for *user_id*.

    If status is "pending" we also probe Chrome directly via check-login so
    that login events are caught even if the background wait-login task missed
    them.

    Returns:
        {"status": "logged_in" | "pending" | "expired" | "not_started"}
    """
    status = get_status(user_id)

    if status == "pending":
        # Probe Chrome to see if the user has already scanned
        acct = account_name(user_id)
        data = _run_cli("--account", acct, "check-login", timeout=30)
        if data.get("logged_in") is True:
            set_logged_in(user_id)
            return {"status": "logged_in"}

    return {"status": status}
