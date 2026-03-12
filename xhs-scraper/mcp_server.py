"""
mcp_server.py

MCP (Model Context Protocol) protocol handler for the XHS scraper service.

This module defines:
  - The canonical tool schema (name, description, parameters JSON Schema)
  - Tool dispatch logic: routes incoming tool-call requests to the correct
    async implementation in tools/

The FastAPI routes in main.py delegate to this module, keeping protocol
concerns separate from HTTP transport concerns.
"""

from __future__ import annotations

import logging
from typing import Any

from tools.qr_login import get_qr_code, check_login_status
from tools.search import search_xhs, get_note_detail

logger = logging.getLogger("xhs.mcp_server")

# ---------------------------------------------------------------------------
# Tool schema definitions (MCP format)
# ---------------------------------------------------------------------------

TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_qr_code",
        "description": (
            "Get the XHS (小红书) login QR code for a user. "
            "Returns a base64-encoded PNG image the UI should display for scanning. "
            "If the user is already logged in, returns {status: 'already_logged_in'}."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "Supabase user ID uniquely identifying the caller",
                },
            },
            "required": ["user_id"],
        },
    },
    {
        "name": "check_login_status",
        "description": (
            "Check the current XHS login status for a user. "
            "Poll this after calling get_qr_code until status == 'logged_in'. "
            "Possible statuses: logged_in | pending | expired | not_started."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "Supabase user ID",
                },
            },
            "required": ["user_id"],
        },
    },
    {
        "name": "search_xhs",
        "description": (
            "Search XHS (小红书) for notes matching a keyword. "
            "Requires the user to be logged in (use check_login_status first). "
            "Returns a list of notes with title, author, likes, comments, and URL."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "Supabase user ID (must be logged in)",
                },
                "keyword": {
                    "type": "string",
                    "description": "Search keyword / query string",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of notes to return (default: 10)",
                    "default": 10,
                    "minimum": 1,
                    "maximum": 100,
                },
                "sort_by": {
                    "type": "string",
                    "description": "Sort order: 综合 | 最新 | 最多点赞 | 最多评论 | 最多收藏 (also accepts: latest, popular)",
                    "default": "综合",
                },
                "note_type": {
                    "type": "string",
                    "description": "Content type filter: 不限 | 视频 | 图文 (also: all, video, image)",
                    "default": "不限",
                },
                "publish_time": {
                    "type": "string",
                    "description": "Time filter: 不限 | 一天内 | 一周内 | 半年内",
                    "default": "不限",
                },
            },
            "required": ["user_id", "keyword"],
        },
    },
    {
        "name": "get_note_detail",
        "description": (
            "Get full details of a specific XHS note by its ID. "
            "Provide xsec_token from a prior search_xhs result for best results. "
            "Falls back to cached search results if the detail fetch fails."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "Supabase user ID (must be logged in)",
                },
                "note_id": {
                    "type": "string",
                    "description": "XHS note / feed ID",
                },
                "xsec_token": {
                    "type": "string",
                    "description": "xsec_token value from search results (optional but recommended)",
                    "default": "",
                },
            },
            "required": ["user_id", "note_id"],
        },
    },
]


# ---------------------------------------------------------------------------
# Tool dispatcher
# ---------------------------------------------------------------------------

class ToolNotFoundError(Exception):
    """Raised when an unknown tool name is requested."""


async def call_tool(tool_name: str, params: dict[str, Any]) -> dict[str, Any]:
    """Dispatch a tool call to the appropriate implementation.

    Args:
        tool_name: One of the tool names defined in TOOLS.
        params:    Keyword arguments for the tool.

    Returns:
        The tool's response dict.

    Raises:
        ToolNotFoundError: If *tool_name* is not registered.
    """
    logger.info("call_tool: %s params=%s", tool_name, {k: v for k, v in params.items() if k != "qr_image_base64"})

    match tool_name:
        case "get_qr_code":
            return await get_qr_code(
                user_id=params["user_id"],
            )

        case "check_login_status":
            return await check_login_status(
                user_id=params["user_id"],
            )

        case "search_xhs":
            return await search_xhs(
                user_id=params["user_id"],
                keyword=params["keyword"],
                limit=int(params.get("limit", 10)),
                sort_by=params.get("sort_by", "综合"),
                note_type=params.get("note_type", "不限"),
                publish_time=params.get("publish_time", "不限"),
            )

        case "get_note_detail":
            return await get_note_detail(
                user_id=params["user_id"],
                note_id=params["note_id"],
                xsec_token=params.get("xsec_token", ""),
            )

        case _:
            raise ToolNotFoundError(f"Unknown tool: {tool_name!r}")
