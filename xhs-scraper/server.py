"""
server.py

FastMCP server for the XHS Agent Platform.

Exposes all xiaohongshu-skills CLI capabilities as MCP tools via SSE transport.

Run:
  fastmcp run server.py --transport sse --port 8000

Or via PM2 (see ecosystem.config.js):
  pm2 start ecosystem.config.js --only xhs-mcp-server

Tools exposed (16 total):
  Auth:     check_login_status, delete_cookies
  Explore:  search_feeds, get_feed_detail, list_feeds, user_profile, get_comments
  Interact: post_comment_to_feed, reply_comment_in_feed, like_feed, favorite_feed
  Publish:  publish_content, publish_with_video, publish_long_article

QR login flow is NOT an MCP tool — it requires browser UI and is handled by
http_app.py on port 8001.
"""

from __future__ import annotations

import json
import logging
import sys
import os

# Ensure the xhs-scraper directory is on sys.path so relative imports work
# when fastmcp runs this file directly.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from fastmcp import FastMCP

from session_manager import (
    account_name,
    get_status,
    is_logged_in,
    set_expired,
)
from tools.search import (
    search_xhs,
    get_note_detail,
    _run_cli,
)
from tools.explore import (
    list_feeds_impl,
    get_feed_detail_impl,
    user_profile_impl,
)
from tools.interact import (
    post_comment_impl,
    reply_comment_impl,
    like_feed_impl,
    favorite_feed_impl,
)
from tools.publish import (
    publish_content_impl,
    publish_with_video_impl,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("xhs.server")

mcp = FastMCP("XHS MCP Server")


# ---------------------------------------------------------------------------
# Auth tools
# ---------------------------------------------------------------------------

@mcp.tool()
async def check_login_status(user_id: str) -> str:
    """
    Check XHS login status for a user.

    Returns one of: logged_in | pending | expired | not_started

    Args:
        user_id: Supabase user ID to check login status for
    """
    status = get_status(user_id)

    # If pending, probe Chrome directly in case wait-login missed the event
    if status == "pending":
        from tools.qr_login import check_login_status as qr_check
        result = await qr_check(user_id)
        status = result.get("status", status)

    return json.dumps({"status": status, "user_id": user_id}, ensure_ascii=False)


@mcp.tool()
async def delete_cookies(user_id: str) -> str:
    """
    Delete XHS cookies for the user (logout / clear session).

    This calls `cli.py --account <name> delete-cookies` and marks the local
    session as expired so subsequent tool calls will require re-login.

    Args:
        user_id: Supabase user ID to log out
    """
    acct = account_name(user_id)
    data = _run_cli("--account", acct, "delete-cookies", timeout=30)

    # Always mark session expired on our side regardless of CLI result
    set_expired(user_id)

    return json.dumps(
        {"success": data.get("success", True), "message": data.get("message", "Cookies deleted"), "user_id": user_id},
        ensure_ascii=False,
    )


# ---------------------------------------------------------------------------
# Explore tools
# ---------------------------------------------------------------------------

@mcp.tool()
async def search_feeds(
    user_id: str,
    keyword: str,
    limit: int = 10,
    sort_by: str = "综合",
    note_type: str = "不限",
    publish_time: str = "不限",
    search_scope: str = "不限",
    location: str = "不限",
) -> str:
    """
    Search XHS notes by keyword.

    Args:
        user_id:      Supabase user ID (must be logged in via QR code)
        keyword:      Search term (supports Chinese)
        limit:        Max number of notes to return (default 10)
        sort_by:      Sort order — 综合 | 最新 | 最多点赞
                      English aliases also accepted: latest, popular, most_liked
        note_type:    Content type filter — 不限 | 视频 | 图文
                      English aliases: all, video, image
        publish_time: Time range filter — 不限 | 一天内 | 一周内 | 半年内
        search_scope: Scope filter — 不限 | 已看过 | 未看过 | 已关注
        location:     Location filter — 不限 | 同城 | 附近

    Returns JSON:
        {"notes": [...XHSNote...], "total": N, "keyword": "..."}
        {"error": "not_logged_in", "message": "..."} if not logged in
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await search_xhs(
        user_id=user_id,
        keyword=keyword,
        limit=limit,
        sort_by=sort_by,
        note_type=note_type,
        publish_time=publish_time,
        search_scope=search_scope,
        location=location,
    )
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def get_feed_detail(
    user_id: str,
    feed_id: str,
    xsec_token: str = "",
    load_all_comments: bool = False,
    click_more_replies: bool = False,
    max_replies_threshold: int = 10,
    max_comment_items: int = 0,
    scroll_speed: str = "normal",
) -> str:
    """
    Get full note detail including comments for a specific XHS note.

    Args:
        user_id:               Supabase user ID (must be logged in)
        feed_id:               XHS note/feed ID (obtained from search_feeds results)
        xsec_token:            xsec_token from the search result (improves API access;
                               leave empty to attempt without it)
        load_all_comments:     Whether to scroll and load all top-level comments
        click_more_replies:    Whether to expand reply threads under each comment
        max_replies_threshold: Only expand reply threads with fewer replies than
                               this threshold (default 10)
        max_comment_items:     Max number of top-level comments to load (0 = no limit)
        scroll_speed:          Scroll speed for loading comments — normal | fast | slow

    Returns JSON:
        Full FeedDetail dict with note content, images, and comments.
        {"error": "not_logged_in", "message": "..."} if not logged in.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await get_feed_detail_impl(
        user_id=user_id,
        feed_id=feed_id,
        xsec_token=xsec_token,
        load_all_comments=load_all_comments,
        click_more_replies=click_more_replies,
        max_replies_threshold=max_replies_threshold,
        max_comment_items=max_comment_items,
        scroll_speed=scroll_speed,
    )
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def list_feeds(user_id: str) -> str:
    """
    Get the homepage recommended feed for the logged-in user.

    Returns a list of recommended notes from the XHS homepage algorithm.

    Args:
        user_id: Supabase user ID (must be logged in via QR code)

    Returns JSON:
        {"feeds": [...], "count": N}
        {"error": "not_logged_in", "message": "..."} if not logged in.
    """
    result = await list_feeds_impl(user_id=user_id)
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def user_profile(user_id: str, target_user_id: str) -> str:
    """
    Get XHS user profile info for any user.

    Args:
        user_id:        Supabase user ID of the requester (must be logged in)
        target_user_id: XHS user ID to look up (from note author_id field)

    Returns JSON:
        User profile dict with follower counts, bio, posts, etc.
        {"error": "not_logged_in", "message": "..."} if not logged in.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await user_profile_impl(
        user_id=user_id,
        target_user_id=target_user_id,
    )
    return json.dumps(result, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Interact tools
# ---------------------------------------------------------------------------

@mcp.tool()
async def post_comment_to_feed(
    user_id: str,
    feed_id: str,
    xsec_token: str,
    content: str,
) -> str:
    """
    Post a top-level comment on an XHS note.

    Args:
        user_id:     Supabase user ID (must be logged in)
        feed_id:     XHS note/feed ID to comment on
        xsec_token:  xsec_token for the note (from search_feeds result)
        content:     Comment text to post

    Returns JSON:
        {"success": true, "message": "Comment posted"} or error dict.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await post_comment_impl(
        user_id=user_id,
        feed_id=feed_id,
        xsec_token=xsec_token,
        content=content,
    )
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def reply_comment_in_feed(
    user_id: str,
    feed_id: str,
    comment_id: str,
    content: str,
) -> str:
    """
    Reply to a specific comment on an XHS note.

    Args:
        user_id:    Supabase user ID (must be logged in)
        feed_id:    XHS note/feed ID containing the comment
        comment_id: ID of the comment to reply to (from get_feed_detail comments)
        content:    Reply text

    Returns JSON:
        {"success": true, "message": "Reply posted"} or error dict.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await reply_comment_impl(
        user_id=user_id,
        feed_id=feed_id,
        comment_id=comment_id,
        content=content,
    )
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def like_feed(
    user_id: str,
    feed_id: str,
    xsec_token: str,
) -> str:
    """
    Toggle like on an XHS note (like if not liked, unlike if already liked).

    Args:
        user_id:    Supabase user ID (must be logged in)
        feed_id:    XHS note/feed ID to like/unlike
        xsec_token: xsec_token for the note (from search_feeds result)

    Returns JSON:
        {"success": true, "liked": true/false, "message": "..."} or error dict.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await like_feed_impl(
        user_id=user_id,
        feed_id=feed_id,
        xsec_token=xsec_token,
    )
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def favorite_feed(
    user_id: str,
    feed_id: str,
    xsec_token: str,
) -> str:
    """
    Toggle collect/favorite on an XHS note.

    Collects the note if not collected, uncollects if already collected.

    Args:
        user_id:    Supabase user ID (must be logged in)
        feed_id:    XHS note/feed ID to collect/uncollect
        xsec_token: xsec_token for the note (from search_feeds result)

    Returns JSON:
        {"success": true, "favorited": true/false, "message": "..."} or error dict.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await favorite_feed_impl(
        user_id=user_id,
        feed_id=feed_id,
        xsec_token=xsec_token,
    )
    return json.dumps(result, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Publish tools
# ---------------------------------------------------------------------------

@mcp.tool()
async def publish_content(
    user_id: str,
    title: str,
    content: str,
    image_paths: list[str],
) -> str:
    """
    Publish an image post (图文笔记) to XHS.

    Title and content are written to temp files internally so that special
    characters and multi-line text are handled safely.

    Args:
        user_id:     Supabase user ID (must be logged in)
        title:       Post title (recommended max 20 characters)
        content:     Post body / description text (can be multi-line)
        image_paths: List of absolute local file paths to images (JPEG/PNG).
                     At least one image is required by XHS.

    Returns JSON:
        {"success": true, "note_id": "...", "note_url": "..."} on success.
        {"error": "not_logged_in", "message": "..."} if not logged in.
        {"error": "no_images", "message": "..."} if image_paths is empty.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await publish_content_impl(
        user_id=user_id,
        title=title,
        content=content,
        image_paths=image_paths,
    )
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def publish_with_video(
    user_id: str,
    title: str,
    content: str,
    video_path: str,
) -> str:
    """
    Publish a video post (视频笔记) to XHS.

    Title and content are written to temp files internally.

    Args:
        user_id:    Supabase user ID (must be logged in)
        title:      Post title
        content:    Post body / description text
        video_path: Absolute local path to the video file (MP4 recommended)

    Returns JSON:
        {"success": true, "note_id": "...", "note_url": "..."} on success.
        {"error": "not_logged_in", "message": "..."} if not logged in.
        {"error": "no_video", "message": "..."} if video_path is empty.
    """
    if not is_logged_in(user_id):
        return json.dumps(
            {"error": "not_logged_in", "message": "Please complete XHS login first — scan QR code at /qr-login"},
            ensure_ascii=False,
        )

    result = await publish_with_video_impl(
        user_id=user_id,
        title=title,
        content=content,
        video_path=video_path,
    )
    return json.dumps(result, ensure_ascii=False)


@mcp.tool()
async def publish_long_article(
    user_id: str,
    title: str,
    content: str,
    description: str = "",
    template_name: str = "",
    image_paths: list[str] | None = None,
) -> str:
    """
    Publish a long-form article on XHS (小红书).

    Three-step flow: fill content → select template → publish.

    Args:
        user_id:       Supabase user ID (must be logged in)
        title:         Article title
        content:       Article body (markdown or plain text)
        description:   Short description shown on publish page (defaults to first 100 chars of content)
        template_name: Layout template name (leave empty to use first available)
        image_paths:   Optional list of local image file paths

    Returns JSON:
        {"success": true, "status": "published"} or {"error": "..."}
    """
    import tempfile
    import os

    if not is_logged_in(user_id):
        return json.dumps({"error": "not_logged_in", "message": "Please complete XHS login first"}, ensure_ascii=False)

    acct = account_name(user_id)

    with tempfile.TemporaryDirectory() as tmpdir:
        title_file = os.path.join(tmpdir, "title.txt")
        content_file = os.path.join(tmpdir, "content.txt")
        desc_file = os.path.join(tmpdir, "desc.txt")

        with open(title_file, "w", encoding="utf-8") as f:
            f.write(title)
        with open(content_file, "w", encoding="utf-8") as f:
            f.write(content)
        desc_text = description or content[:100]
        with open(desc_file, "w", encoding="utf-8") as f:
            f.write(desc_text)

        # Step 1: Fill long article
        long_args = ["--account", acct, "long-article", "--title-file", title_file, "--content-file", content_file]
        if image_paths:
            long_args += ["--images"] + image_paths
        result = _run_cli(*long_args, timeout=90)
        if "error" in result:
            return json.dumps({"error": result["error"]}, ensure_ascii=False)

        templates = result.get("templates", [])

        # Step 2: Select template (use first if not specified)
        chosen_template = template_name or (templates[0] if templates else "")
        if chosen_template:
            sel_result = _run_cli("--account", acct, "select-template", "--name", chosen_template, timeout=30)
            if sel_result.get("success") is False:
                logger.warning("Template selection failed: %s", sel_result)

        # Step 3: Next step + fill description
        next_result = _run_cli("--account", acct, "next-step", "--content-file", desc_file, timeout=30)
        if "error" in next_result:
            return json.dumps({"error": next_result.get("error", "next-step failed")}, ensure_ascii=False)

        # Step 4: Click publish
        pub_result = _run_cli("--account", acct, "click-publish", timeout=30)

        return json.dumps({
            "success": True,
            "status": "published",
            "templates_available": templates,
            "template_used": chosen_template,
        }, ensure_ascii=False)


@mcp.tool()
async def get_comments(
    user_id: str,
    feed_id: str,
    xsec_token: str = "",
    max_comments: int = 20,
    include_replies: bool = False,
) -> str:
    """
    Get comments for an XHS note (lightweight — skips loading the full note content).

    Use this instead of get_feed_detail when you only need the comments.

    Args:
        user_id:         Supabase user ID (must be logged in)
        feed_id:         XHS note/feed ID
        xsec_token:      xsec_token from search results
        max_comments:    Maximum number of top-level comments to load (default 20)
        include_replies: Whether to expand and load reply threads (slower, default False)

    Returns JSON:
        {"comments": [...], "has_more": bool, "feed_id": "..."}
    """
    if not is_logged_in(user_id):
        return json.dumps({"error": "not_logged_in"}, ensure_ascii=False)

    result = await get_feed_detail_impl(
        user_id=user_id,
        feed_id=feed_id,
        xsec_token=xsec_token,
        load_all_comments=True,
        click_more_replies=include_replies,
        max_replies_threshold=5 if include_replies else 0,
        max_comment_items=max_comments,
        scroll_speed="fast",
    )

    if "error" in result:
        return json.dumps(result, ensure_ascii=False)

    comments_data = result.get("comments", {})
    return json.dumps({
        "feed_id": feed_id,
        "comments": comments_data.get("list", []),
        "has_more": comments_data.get("has_more", False),
        "total_loaded": len(comments_data.get("list", [])),
    }, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Allow running directly: python3 server.py
    # Defaults to SSE transport on port 8000 for direct invocation.
    mcp.run(transport="sse", host="0.0.0.0", port=8000)
