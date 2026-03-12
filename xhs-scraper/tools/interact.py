"""
tools/interact.py

MCP tool implementations for XHS interaction operations:
  - post_comment_impl    → post a comment on a note
  - reply_comment_impl   → reply to a specific comment
  - like_feed_impl       → like/unlike a note
  - favorite_feed_impl   → collect/uncollect a note

CLI commands used:
  cli.py --account <name> post-comment --feed-id <id> --xsec-token <tok> --content <text>
      → {"success": bool, "message": str, ...}

  cli.py --account <name> reply-comment --feed-id <id> --comment-id <cid> --content <text>
      → {"success": bool, "message": str, ...}

  cli.py --account <name> like-feed --feed-id <id> --xsec-token <tok>
      → {"success": bool, "message": str, "liked": bool, ...}

  cli.py --account <name> favorite-feed --feed-id <id> --xsec-token <tok>
      → {"success": bool, "message": str, "favorited": bool, ...}
"""

from __future__ import annotations

import logging
from typing import Any

from session_manager import account_name, is_logged_in
from tools.search import _run_cli

logger = logging.getLogger("xhs.tools.interact")

_NOT_LOGGED_IN = {
    "error": "not_logged_in",
    "message": "Please complete XHS login first — scan QR code at /qr-login",
}


# ---------------------------------------------------------------------------
# post_comment_impl
# ---------------------------------------------------------------------------

async def post_comment_impl(
    user_id: str,
    feed_id: str,
    xsec_token: str,
    content: str,
) -> dict[str, Any]:
    """
    Post a top-level comment on the note identified by feed_id.

    Args:
        user_id:     Supabase user ID (must be logged in)
        feed_id:     XHS note/feed ID to comment on
        xsec_token:  xsec_token for the note (from search result)
        content:     Comment text to post

    Returns:
        {"success": true, "message": "..."} on success, or error dict.
    """
    if not is_logged_in(user_id):
        return _NOT_LOGGED_IN

    acct = account_name(user_id)
    data = _run_cli(
        "--account", acct,
        "post-comment",
        "--feed-id", feed_id,
        "--xsec-token", xsec_token,
        "--content", content,
        timeout=45,
    )

    if "error" in data and not data.get("success"):
        return {"error": data.get("error", "unknown"), "feed_id": feed_id}

    return data


# ---------------------------------------------------------------------------
# reply_comment_impl
# ---------------------------------------------------------------------------

async def reply_comment_impl(
    user_id: str,
    feed_id: str,
    comment_id: str,
    content: str,
) -> dict[str, Any]:
    """
    Reply to a specific comment on a note.

    Args:
        user_id:    Supabase user ID (must be logged in)
        feed_id:    XHS note/feed ID containing the comment
        comment_id: ID of the comment to reply to
        content:    Reply text

    Returns:
        {"success": true, "message": "..."} on success, or error dict.
    """
    if not is_logged_in(user_id):
        return _NOT_LOGGED_IN

    acct = account_name(user_id)
    data = _run_cli(
        "--account", acct,
        "reply-comment",
        "--feed-id", feed_id,
        "--comment-id", comment_id,
        "--content", content,
        timeout=45,
    )

    if "error" in data and not data.get("success"):
        return {"error": data.get("error", "unknown"), "feed_id": feed_id, "comment_id": comment_id}

    return data


# ---------------------------------------------------------------------------
# like_feed_impl
# ---------------------------------------------------------------------------

async def like_feed_impl(
    user_id: str,
    feed_id: str,
    xsec_token: str,
) -> dict[str, Any]:
    """
    Toggle like on a note (like if not liked, unlike if already liked).

    Args:
        user_id:    Supabase user ID (must be logged in)
        feed_id:    XHS note/feed ID
        xsec_token: xsec_token for the note (from search result)

    Returns:
        {"success": true, "liked": bool, "message": "..."} or error dict.
    """
    if not is_logged_in(user_id):
        return _NOT_LOGGED_IN

    acct = account_name(user_id)
    data = _run_cli(
        "--account", acct,
        "like-feed",
        "--feed-id", feed_id,
        "--xsec-token", xsec_token,
        timeout=45,
    )

    if "error" in data and not data.get("success"):
        return {"error": data.get("error", "unknown"), "feed_id": feed_id}

    return data


# ---------------------------------------------------------------------------
# favorite_feed_impl
# ---------------------------------------------------------------------------

async def favorite_feed_impl(
    user_id: str,
    feed_id: str,
    xsec_token: str,
) -> dict[str, Any]:
    """
    Toggle collect/favorite on a note (collect if not collected, uncollect if collected).

    Args:
        user_id:    Supabase user ID (must be logged in)
        feed_id:    XHS note/feed ID
        xsec_token: xsec_token for the note (from search result)

    Returns:
        {"success": true, "favorited": bool, "message": "..."} or error dict.
    """
    if not is_logged_in(user_id):
        return _NOT_LOGGED_IN

    acct = account_name(user_id)
    data = _run_cli(
        "--account", acct,
        "favorite-feed",
        "--feed-id", feed_id,
        "--xsec-token", xsec_token,
        timeout=45,
    )

    if "error" in data and not data.get("success"):
        return {"error": data.get("error", "unknown"), "feed_id": feed_id}

    return data
