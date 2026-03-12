"""
tools/explore.py

MCP tool implementations for XHS explore/browse operations:
  - list_feeds_impl        → homepage recommended feed
  - get_feed_detail_impl   → full note detail + comments
  - user_profile_impl      → user profile info

CLI commands used:
  cli.py --account <name> list-feeds
      → {"feeds": [...], "count": N}

  cli.py --account <name> get-feed-detail --feed-id <id> [--xsec-token <tok>]
      → full FeedDetail dict

  cli.py --account <name> user-profile --user-id <uid>
      → user profile dict
"""

from __future__ import annotations

import json
import logging
from typing import Any

from session_manager import account_name, is_logged_in
from tools.search import _run_cli

logger = logging.getLogger("xhs.tools.explore")


# ---------------------------------------------------------------------------
# list_feeds_impl
# ---------------------------------------------------------------------------

async def list_feeds_impl(user_id: str) -> dict[str, Any]:
    """
    Get homepage recommended feed for the logged-in user.

    Returns:
        {"feeds": [...], "count": N}
        {"error": "not_logged_in", "message": "..."}
        {"error": "..."}
    """
    if not is_logged_in(user_id):
        return {
            "error": "not_logged_in",
            "message": "Please complete XHS login first — scan QR code at /qr-login",
        }

    acct = account_name(user_id)
    data = _run_cli("--account", acct, "list-feeds", timeout=60)

    if "error" in data and "feeds" not in data:
        return {"error": data["error"]}

    feeds: list[dict] = data.get("feeds") or []
    return {
        "feeds": feeds,
        "count": data.get("count", len(feeds)),
    }


# ---------------------------------------------------------------------------
# get_feed_detail_impl
# ---------------------------------------------------------------------------

async def get_feed_detail_impl(
    user_id: str,
    feed_id: str,
    xsec_token: str = "",
) -> dict[str, Any]:
    """
    Get full note detail including comments for the given feed_id.

    Args:
        user_id:     Supabase user ID (must be logged in)
        feed_id:     XHS note/feed ID
        xsec_token:  xsec_token from search results (improves API access)

    Returns:
        Full FeedDetail dict from the CLI, or error dict.
    """
    if not is_logged_in(user_id):
        return {
            "error": "not_logged_in",
            "message": "Please complete XHS login first — scan QR code at /qr-login",
        }

    acct = account_name(user_id)
    cli_args = ["--account", acct, "get-feed-detail", "--feed-id", feed_id]
    if xsec_token:
        cli_args += ["--xsec-token", xsec_token]

    data = _run_cli(*cli_args, timeout=45)

    if "error" in data:
        return {"error": data["error"], "feed_id": feed_id}

    return data


# ---------------------------------------------------------------------------
# user_profile_impl
# ---------------------------------------------------------------------------

async def user_profile_impl(
    user_id: str,
    target_user_id: str,
) -> dict[str, Any]:
    """
    Get XHS user profile info for the target user.

    Args:
        user_id:        Supabase user ID of the requester (must be logged in)
        target_user_id: XHS user ID to look up

    Returns:
        User profile dict from the CLI, or error dict.
    """
    if not is_logged_in(user_id):
        return {
            "error": "not_logged_in",
            "message": "Please complete XHS login first — scan QR code at /qr-login",
        }

    acct = account_name(user_id)
    data = _run_cli(
        "--account", acct,
        "user-profile",
        "--user-id", target_user_id,
        timeout=45,
    )

    if "error" in data:
        return {"error": data["error"], "target_user_id": target_user_id}

    return data
