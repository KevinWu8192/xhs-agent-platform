"""
tools/search.py

MCP tools for XHS content search and note detail retrieval.

CLI commands used:
  cli.py --account <name> search-feeds --keyword <kw> [--sort-by <s>] [--note-type <t>]
      → {"feeds": [...], "count": N}

  cli.py --account <name> get-feed-detail --feed-id <id> --xsec-token <token>
      → full FeedDetail dict

XHSNote shape (matches lib/xhs-client.ts and types/index.ts):
  id, title, author, author_id, content_preview, likes, comments, shares,
  tags, cover_image_url, note_url, published_at, collected_at
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
from datetime import datetime, timezone
from typing import Any

from session_manager import (
    XHS_SKILLS_DIR,
    CLI_SCRIPT,
    account_name,
    is_logged_in,
)

logger = logging.getLogger("xhs.tools.search")

# In-memory cache of search results keyed by (user_id, keyword) — useful for
# note-detail fallback when the CLI doesn't return full detail.
_search_cache: dict[tuple[str, str], list[dict[str, Any]]] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run_cli(*args: str, timeout: int = 60) -> dict[str, Any]:
    """Run cli.py synchronously and return parsed JSON output."""
    cmd = ["python3", str(CLI_SCRIPT), *args]
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
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
            return {
                "error": result.stderr.strip() or "empty CLI output",
                "exit_code": result.returncode,
            }
        return _extract_last_json(raw)
    except subprocess.TimeoutExpired:
        return {"error": f"CLI timed out after {timeout}s"}
    except Exception as exc:
        logger.exception("CLI call failed")
        return {"error": str(exc)}


def _extract_last_json(text: str) -> dict[str, Any]:
    lines = text.splitlines()
    for i in range(len(lines) - 1, -1, -1):
        candidate = "\n".join(lines[i:])
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text, "error": "failed to parse CLI JSON output"}


def _parse_count(raw: str | None) -> int:
    """Parse Chinese count strings like '1.2万' or '456' into int."""
    if not raw:
        return 0
    s = str(raw).strip()
    if s.endswith("万"):
        try:
            return round(float(s[:-1]) * 10_000)
        except ValueError:
            return 0
    try:
        return int(s)
    except ValueError:
        return 0


def _map_feed_to_note(feed: dict[str, Any], keyword: str) -> dict[str, Any]:
    """Convert a CLI feed record to the XHSNote shape."""
    note_id: str = feed.get("id") or ""
    xsec_token: str = feed.get("xsecToken") or ""
    note_url = (
        f"https://www.xiaohongshu.com/explore/{note_id}?xsec_token={xsec_token}"
        if note_id and xsec_token
        else f"https://www.xiaohongshu.com/explore/{note_id}"
    )
    interact: dict = feed.get("interactInfo") or {}
    user: dict = feed.get("user") or {}
    now = datetime.now(tz=timezone.utc).isoformat()
    return {
        "id": note_id,
        "xsec_token": xsec_token,
        "title": feed.get("displayTitle") or f"关于「{keyword}」的笔记",
        "author": user.get("nickname") or "未知用户",
        "author_id": user.get("userId") or "",
        "content_preview": feed.get("displayTitle") or "",
        "likes": _parse_count(interact.get("likedCount")),
        "comments": _parse_count(interact.get("commentCount")),
        "shares": _parse_count(interact.get("sharedCount")),
        "collected": _parse_count(interact.get("collectedCount")),
        "tags": [keyword],
        "cover_image_url": feed.get("cover") or None,
        "note_url": note_url,
        "published_at": now,
        "collected_at": now,
    }


# Sort option mapping (mirrors lib/xhs-client.ts mapSortBy)
_SORT_MAP: dict[str, str] = {
    "综合": "综合",
    "latest": "最新",
    "最新": "最新",
    "popular": "最多点赞",
    "最多点赞": "最多点赞",
    "most_liked": "最多点赞",
    "最多评论": "最多评论",
    "最多收藏": "最多收藏",
}

_NOTE_TYPE_MAP: dict[str, str] = {
    "不限": "不限",
    "all": "不限",
    "video": "视频",
    "视频": "视频",
    "image": "图文",
    "图文": "图文",
    "normal": "图文",
}


# ---------------------------------------------------------------------------
# MCP Tool: search_xhs
# ---------------------------------------------------------------------------

async def search_xhs(
    user_id: str,
    keyword: str,
    limit: int = 10,
    sort_by: str = "综合",
    note_type: str = "不限",
    publish_time: str = "不限",
) -> dict[str, Any]:
    """
    MCP tool: search_xhs

    Search XHS for *keyword* and return a list of notes.

    Args:
        user_id:      Supabase user ID (must be logged in)
        keyword:      Search term
        limit:        Max number of notes to return (default 10)
        sort_by:      Sort order — 综合 | 最新 | 最多点赞 | 最多评论 | 最多收藏
                      Also accepts English aliases: latest, popular, most_liked
        note_type:    Content type filter — 不限 | 视频 | 图文
                      Also accepts: all, video, image, normal
        publish_time: Time filter — 不限 | 一天内 | 一周内 | 半年内

    Returns:
        {"notes": [...XHSNote...], "total": N, "keyword": "..."}
        {"error": "not_logged_in"}
        {"error": "..."}
    """
    if not is_logged_in(user_id):
        return {"error": "not_logged_in", "message": "Please complete XHS login first"}

    acct = account_name(user_id)
    sort_arg = _SORT_MAP.get(sort_by, "综合")
    type_arg = _NOTE_TYPE_MAP.get(note_type, "不限")

    cli_args: list[str] = [
        "--account", acct,
        "search-feeds",
        "--keyword", keyword,
        "--sort-by", sort_arg,
        "--note-type", type_arg,
    ]
    if publish_time and publish_time not in ("不限", "all"):
        cli_args += ["--publish-time", publish_time]

    data = _run_cli(*cli_args, timeout=60)

    if "error" in data and "feeds" not in data:
        return {"error": data["error"], "keyword": keyword}

    feeds: list[dict] = data.get("feeds") or []
    notes = [_map_feed_to_note(f, keyword) for f in feeds[:limit]]

    # Cache for note-detail fallback
    _search_cache[(user_id, keyword)] = notes

    return {
        "notes": notes,
        "total": data.get("count", len(notes)),
        "keyword": keyword,
    }


# ---------------------------------------------------------------------------
# MCP Tool: get_note_detail
# ---------------------------------------------------------------------------

async def get_note_detail(user_id: str, note_id: str, xsec_token: str = "") -> dict[str, Any]:
    """
    MCP tool: get_note_detail

    Fetch full detail for a specific XHS note.

    Tries the CLI's get-feed-detail command first; falls back to returning
    the cached note from a prior search result if the CLI fails.

    Args:
        user_id:    Supabase user ID
        note_id:    XHS note/feed ID
        xsec_token: xsec_token from the search result (required by the API)

    Returns:
        Full FeedDetail dict from the CLI, or cached XHSNote, or error.
    """
    if not is_logged_in(user_id):
        return {"error": "not_logged_in", "message": "Please complete XHS login first"}

    acct = account_name(user_id)

    if xsec_token:
        data = _run_cli(
            "--account", acct,
            "get-feed-detail",
            "--feed-id", note_id,
            "--xsec-token", xsec_token,
            timeout=45,
        )
        if "error" not in data:
            return data

    # Fallback: scan all cached search results for this user
    for (uid, _keyword), notes in _search_cache.items():
        if uid != user_id:
            continue
        for note in notes:
            if note.get("id") == note_id:
                logger.info(
                    "get_note_detail falling back to cached search result for note %s", note_id
                )
                return note

    return {
        "error": "not_found",
        "message": f"Note {note_id} not found in cache. Provide xsec_token or search first.",
    }
