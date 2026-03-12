"""
http_app.py

FastAPI HTTP application for QR login endpoints only.

QR login cannot be an MCP tool because it requires returning a base64 PNG image
that the frontend renders in a modal dialog.  These endpoints are consumed by the
Next.js frontend QR login modal and must remain plain HTTP.

Endpoints:
  GET  /qr-login?user_id=<uid>       → trigger QR code generation, returns base64 PNG
  GET  /login-status?user_id=<uid>   → poll login state (frontend polls this)
  GET  /health                       → liveness probe

Port: 8001 (see ecosystem.config.js)
CORS: allows http://localhost:3000 and the production frontend origin.

Run:
  uvicorn http_app:app --host 0.0.0.0 --port 8001 --workers 1
"""

from __future__ import annotations

import logging
import os
import sys

# Ensure xhs-scraper directory is on sys.path when running via uvicorn
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any

from tools.qr_login import get_qr_code, check_login_status as qr_check_status
from session_manager import get_status

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("xhs.http_app")

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="XHS QR Login API",
    description="HTTP endpoints for XHS QR code login flow (used by frontend modal)",
    version="1.0.0",
)

# CORS — allow the Next.js dev server and production frontend
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    # Add production domain here if needed, e.g.:
    # "https://your-app.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Liveness probe — returns 200 OK if the service is running."""
    return {"status": "ok", "service": "xhs-http-app"}


# ---------------------------------------------------------------------------
# GET /qr-login
# ---------------------------------------------------------------------------

@app.get("/qr-login")
async def qr_login(user_id: str = Query(..., description="Supabase user ID")):
    """
    Initiate QR code login for the given user.

    Starts a Chrome browser session, fetches the XHS QR code, and returns it
    as a base64-encoded PNG so the frontend can render it inline.

    Also kicks off a background wait-login task that will mark the session as
    logged_in once the user scans the QR code.

    Returns:
        200 {"status": "already_logged_in"} — user already has a valid session
        200 {"status": "qr_ready", "qr_image_base64": "...", "session_id": "..."} — QR ready
        500 {"status": "error", "message": "..."} — something went wrong
    """
    logger.info("QR login requested for user_id=%s", user_id)

    if not user_id or not user_id.strip():
        raise HTTPException(status_code=400, detail="user_id is required")

    result = await get_qr_code(user_id.strip())

    if result.get("status") == "error":
        return JSONResponse(status_code=500, content=result)

    return result


# ---------------------------------------------------------------------------
# GET /login-status
# ---------------------------------------------------------------------------

@app.get("/login-status")
async def login_status(user_id: str = Query(..., description="Supabase user ID")):
    """
    Poll login status for the given user.

    The frontend QR modal calls this endpoint every few seconds after
    displaying the QR code.  When status becomes "logged_in" the modal closes.

    Returns:
        200 {"status": "logged_in" | "pending" | "expired" | "not_started"}
    """
    if not user_id or not user_id.strip():
        raise HTTPException(status_code=400, detail="user_id is required")

    result = await qr_check_status(user_id.strip())
    return result


# ---------------------------------------------------------------------------
# POST /tools/call
# ---------------------------------------------------------------------------

class ToolCallRequest(BaseModel):
    tool: str
    params: dict[str, Any] = {}

@app.post("/tools/call")
async def tools_call(body: ToolCallRequest) -> dict:
    """Generic tool dispatcher for legacy HTTP clients."""
    tool = body.tool
    params = body.params
    user_id = params.get("user_id", "")

    if tool == "get_qr_code":
        return await get_qr_code(user_id)
    elif tool == "check_login_status":
        return await qr_check_status(user_id)
    elif tool == "search_feeds":
        from tools.search import search_xhs
        return await search_xhs(
            user_id=user_id,
            keyword=params.get("keyword", ""),
            limit=params.get("limit", 20),
            sort_by=params.get("sort_by", "最多点赞"),
        )
    else:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool}")
