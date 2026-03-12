"""
tools/publish.py

MCP tool implementations for XHS content publishing:
  - publish_content_impl      → publish an image post (图文笔记)
  - publish_with_video_impl   → publish a video post (视频笔记)

CLI commands used:
  cli.py --account <name> publish
      --title-file <path>
      --content-file <path>
      --images <path1> [<path2> ...]
      → {"success": bool, "note_id": str, "note_url": str, ...}

  cli.py --account <name> publish-video
      --title-file <path>
      --content-file <path>
      --video <path>
      → {"success": bool, "note_id": str, "note_url": str, ...}

Title and content are written to temp files and passed via --title-file /
--content-file flags so that multi-line content and special characters are
handled safely without shell quoting issues.
"""

from __future__ import annotations

import logging
import os
import tempfile
from typing import Any

from session_manager import account_name, is_logged_in
from tools.search import _run_cli

logger = logging.getLogger("xhs.tools.publish")

_NOT_LOGGED_IN = {
    "error": "not_logged_in",
    "message": "Please complete XHS login first — scan QR code at /qr-login",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_temp_text(text: str, suffix: str = ".txt") -> str:
    """Write *text* to a named temp file and return its path.

    The caller is responsible for deleting the file when done.
    """
    fd, path = tempfile.mkstemp(suffix=suffix, prefix="xhs_pub_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
    except Exception:
        os.close(fd)
        raise
    return path


# ---------------------------------------------------------------------------
# publish_content_impl
# ---------------------------------------------------------------------------

async def publish_content_impl(
    user_id: str,
    title: str,
    content: str,
    image_paths: list[str],
) -> dict[str, Any]:
    """
    Publish an image post (图文笔记) to XHS.

    Args:
        user_id:     Supabase user ID (must be logged in)
        title:       Post title (max ~20 chars recommended)
        content:     Post body / description text
        image_paths: List of local absolute paths to images (JPEG/PNG).
                     At least one image is required by XHS.

    Returns:
        {"success": true, "note_id": "...", "note_url": "..."} or error dict.
    """
    if not is_logged_in(user_id):
        return _NOT_LOGGED_IN

    if not image_paths:
        return {"error": "no_images", "message": "At least one image path is required to publish an image post"}

    acct = account_name(user_id)

    title_file: str | None = None
    content_file: str | None = None
    try:
        title_file = _write_temp_text(title, suffix=".title.txt")
        content_file = _write_temp_text(content, suffix=".content.txt")

        cli_args = [
            "--account", acct,
            "publish",
            "--title-file", title_file,
            "--content-file", content_file,
            "--images", *image_paths,
        ]
        data = _run_cli(*cli_args, timeout=120)
    finally:
        for path in (title_file, content_file):
            if path:
                try:
                    os.unlink(path)
                except OSError:
                    pass

    if "error" in data and not data.get("success"):
        return {"error": data.get("error", "publish_failed"), "title": title}

    return data


# ---------------------------------------------------------------------------
# publish_with_video_impl
# ---------------------------------------------------------------------------

async def publish_with_video_impl(
    user_id: str,
    title: str,
    content: str,
    video_path: str,
) -> dict[str, Any]:
    """
    Publish a video post (视频笔记) to XHS.

    Args:
        user_id:    Supabase user ID (must be logged in)
        title:      Post title
        content:    Post body / description text
        video_path: Absolute local path to the video file (MP4 recommended)

    Returns:
        {"success": true, "note_id": "...", "note_url": "..."} or error dict.
    """
    if not is_logged_in(user_id):
        return _NOT_LOGGED_IN

    if not video_path:
        return {"error": "no_video", "message": "A video file path is required to publish a video post"}

    acct = account_name(user_id)

    title_file: str | None = None
    content_file: str | None = None
    try:
        title_file = _write_temp_text(title, suffix=".title.txt")
        content_file = _write_temp_text(content, suffix=".content.txt")

        cli_args = [
            "--account", acct,
            "publish-video",
            "--title-file", title_file,
            "--content-file", content_file,
            "--video", video_path,
        ]
        data = _run_cli(*cli_args, timeout=300)
    finally:
        for path in (title_file, content_file):
            if path:
                try:
                    os.unlink(path)
                except OSError:
                    pass

    if "error" in data and not data.get("success"):
        return {"error": data.get("error", "publish_failed"), "title": title}

    return data
