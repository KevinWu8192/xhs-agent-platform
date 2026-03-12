"""
session_manager.py

Per-user XHS session management.

Each user (keyed by their Supabase user_id) gets an isolated session backed by
a named Chrome account in xiaohongshu-skills.  Session state is persisted as a
JSON file under ~/.xhs_sessions/<user_id>.json so it survives server restarts.

Session lifecycle:
  - "not_started"  — no record at all
  - "pending"      — get-qrcode was called but wait-login not yet confirmed
  - "logged_in"    — wait-login succeeded; session valid until expires_at
  - "expired"      — logged_in but past expires_at
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Literal

logger = logging.getLogger("xhs.session_manager")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SESSION_DIR = Path(os.path.expanduser("~/.xhs_sessions"))
SESSION_TTL_DAYS = 7

XHS_SKILLS_DIR = Path(os.path.expanduser("~/.claude/skills/xiaohongshu-skills-main"))
CLI_SCRIPT = XHS_SKILLS_DIR / "scripts" / "cli.py"

# Base Chrome debug port; each user gets BASE_PORT + <account_index>
# We delegate port management to xiaohongshu-skills account_manager, so we just
# use the --account flag and let the CLI resolve the port.

SessionStatus = Literal["not_started", "pending", "logged_in", "expired"]


# ---------------------------------------------------------------------------
# Session record helpers
# ---------------------------------------------------------------------------

def _session_path(user_id: str) -> Path:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    return SESSION_DIR / f"{user_id}.json"


def _load_session(user_id: str) -> dict | None:
    """Load session record from disk; return None if missing."""
    path = _session_path(user_id)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _save_session(user_id: str, record: dict) -> None:
    """Persist session record to disk."""
    _session_path(user_id).write_text(
        json.dumps(record, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()


def _expires_iso() -> str:
    return (datetime.now(tz=timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()


# ---------------------------------------------------------------------------
# Account name helpers
# ---------------------------------------------------------------------------

def account_name(user_id: str) -> str:
    """Map a Supabase user_id to a short, filesystem-safe account name.

    xiaohongshu-skills account names are used as directory names and in
    temp-file paths, so we truncate to 32 chars and strip unsafe chars.
    """
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in user_id)
    return f"u_{safe[:32]}"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_status(user_id: str) -> SessionStatus:
    """Return the current session status for *user_id*."""
    record = _load_session(user_id)
    if not record:
        return "not_started"

    status: str = record.get("status", "not_started")
    if status == "logged_in":
        expires_at = record.get("expires_at")
        if expires_at:
            try:
                exp = datetime.fromisoformat(expires_at)
                if exp < datetime.now(tz=timezone.utc):
                    # Update on disk to avoid re-computing next time
                    record["status"] = "expired"
                    _save_session(user_id, record)
                    return "expired"
            except ValueError:
                pass
        return "logged_in"

    return status  # type: ignore[return-value]


def is_logged_in(user_id: str) -> bool:
    return get_status(user_id) == "logged_in"


def set_pending(user_id: str) -> None:
    """Mark a user session as pending QR scan."""
    record = _load_session(user_id) or {}
    record.update(
        {
            "user_id": user_id,
            "account": account_name(user_id),
            "status": "pending",
            "updated_at": _now_iso(),
        }
    )
    _save_session(user_id, record)


def set_logged_in(user_id: str) -> None:
    """Mark a user session as fully logged in and reset TTL."""
    record = _load_session(user_id) or {}
    record.update(
        {
            "user_id": user_id,
            "account": account_name(user_id),
            "status": "logged_in",
            "logged_in_at": _now_iso(),
            "expires_at": _expires_iso(),
            "updated_at": _now_iso(),
        }
    )
    _save_session(user_id, record)


def set_expired(user_id: str) -> None:
    """Force-expire a session (e.g. on explicit logout)."""
    record = _load_session(user_id) or {}
    record.update({"status": "expired", "updated_at": _now_iso()})
    _save_session(user_id, record)


def ensure_account_exists(user_id: str) -> str:
    """Ensure the xiaohongshu-skills named account exists; return account name.

    Calls `cli.py add-account` idempotently — it is safe to call on every
    login attempt because account_manager checks for duplicates.
    """
    name = account_name(user_id)
    try:
        result = subprocess.run(
            [
                "python3",
                str(CLI_SCRIPT),
                "add-account",
                "--name", name,
                "--description", f"XHS scraper account for user {user_id[:8]}",
            ],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(XHS_SKILLS_DIR),
        )
        data = json.loads(result.stdout)
        if data.get("success"):
            logger.info("Account ready: %s (port=%s)", name, data.get("port"))
        else:
            logger.warning("add-account returned: %s", data)
    except Exception as exc:
        # Not fatal — account might already exist
        logger.warning("ensure_account_exists(%s) error: %s", name, exc)
    return name
