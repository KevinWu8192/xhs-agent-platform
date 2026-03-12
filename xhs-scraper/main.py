"""
main.py

FastAPI entry point for the XHS Scraper MCP Service.

Endpoints:
  GET  /health           — health check
  GET  /tools/list       — list available MCP tools with their schemas
  POST /tools/call       — invoke a tool by name with params

Request body for POST /tools/call:
  {
    "tool": "search_xhs",
    "params": {
      "user_id": "...",
      "keyword": "..."
    }
  }

The service runs on port 8000 and is called by the Next.js app (port 3000)
running on the same host via http://localhost:8000.

Error handling:
  - Tool-level errors are returned as HTTP 200 with {"error": "..."} in the
    response body (so the caller can always JSON.parse the result).
  - Server-level errors (bad request format, unknown tool) use HTTP 4xx/5xx.
  - Unhandled exceptions are caught at the middleware level and returned as
    HTTP 500 JSON rather than crashing the server.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from mcp_server import TOOLS, ToolNotFoundError, call_tool

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("xhs.main")


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown hooks)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    """Application startup and shutdown tasks."""
    logger.info("XHS Scraper MCP Service starting on port 8000")
    # Could pre-warm Chrome sessions here if needed
    yield
    logger.info("XHS Scraper MCP Service shutting down")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="XHS Scraper MCP Service",
    description=(
        "FastAPI MCP server wrapping the xiaohongshu-skills CLI. "
        "Provides QR login, session management, and XHS search tools."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the Next.js dev server (port 3000) and any configured origin to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler — never crash on unhandled exceptions
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "internal_error",
            "message": str(exc),
        },
    )


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ToolCallRequest(BaseModel):
    tool: str = Field(..., description="Tool name to invoke")
    params: dict[str, Any] = Field(default_factory=dict, description="Tool input parameters")


class ToolCallResponse(BaseModel):
    success: bool
    tool: str
    result: dict[str, Any] | None = None
    error: str | None = None
    duration_ms: float | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "xhs-scraper"
    version: str = "1.0.0"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    """Simple health check endpoint."""
    return HealthResponse()


@app.get("/tools/list", tags=["mcp"])
async def tools_list() -> dict[str, Any]:
    """Return all available MCP tools with their JSON Schema definitions."""
    return {"tools": TOOLS, "count": len(TOOLS)}


@app.post("/tools/call", response_model=ToolCallResponse, tags=["mcp"])
async def tools_call(body: ToolCallRequest) -> ToolCallResponse:
    """Invoke a named MCP tool with the supplied params.

    Returns HTTP 200 with success=True/False regardless of tool outcome so
    the caller can always parse the JSON response.  HTTP 4xx is used only for
    malformed request bodies.
    """
    start = time.monotonic()
    tool_name = body.tool.strip()

    if not tool_name:
        raise HTTPException(status_code=400, detail="'tool' field must not be empty")

    try:
        result = await call_tool(tool_name, body.params)
        duration_ms = (time.monotonic() - start) * 1000

        # Distinguish tool-level errors from success
        if isinstance(result, dict) and "error" in result:
            return ToolCallResponse(
                success=False,
                tool=tool_name,
                result=result,
                error=result.get("error"),
                duration_ms=round(duration_ms, 1),
            )

        return ToolCallResponse(
            success=True,
            tool=tool_name,
            result=result,
            duration_ms=round(duration_ms, 1),
        )

    except ToolNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    except Exception as exc:
        logger.exception("Tool %r raised an unexpected exception", tool_name)
        duration_ms = (time.monotonic() - start) * 1000
        return ToolCallResponse(
            success=False,
            tool=tool_name,
            error=f"unexpected_error: {exc}",
            duration_ms=round(duration_ms, 1),
        )


# ---------------------------------------------------------------------------
# Dev-mode entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
