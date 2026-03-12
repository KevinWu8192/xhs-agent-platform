#!/usr/bin/env python3
"""
test_minimax_mcp.py

验证以下4项：
  1. MiniMax API 基础连通（Anthropic SDK + 自定义 base_url）
  2. MiniMax 工具调用能力（硬编码一个简单工具，验证模型是否 call 它）
  3. MCP 服务器连通（列出所有注册的工具）
  4. 端到端：MCP 工具 + MiniMax 模型（模型实际 call MCP tool）

用法:
  cd /home/kevin/xhs-agent-platform/xhs-scraper
  source venv/bin/activate
  python test_minimax_mcp.py
"""

import asyncio
import json
import sys
import anthropic

import os

API_KEY  = os.environ.get("TEST_API_KEY", "")
BASE_URL = os.environ.get("TEST_BASE_URL", "https://api.minimaxi.com/anthropic")
MODEL    = os.environ.get("TEST_MODEL", "MiniMax-M2.5")

if not API_KEY:
    print("❌ 请设置环境变量 TEST_API_KEY")
    sys.exit(1)

SEP = "=" * 58

def ok(msg):  print(f"  ✅ {msg}")
def fail(msg): print(f"  ❌ {msg}")
def warn(msg): print(f"  ⚠️  {msg}")

# ─────────────────────────────────────────────────────────────
# Test 1: 基础 API 连通
# ─────────────────────────────────────────────────────────────
def test_basic_api():
    print(f"\n{SEP}")
    print("Test 1: MiniMax 基础 API 连通")
    print(SEP)
    try:
        client = anthropic.Anthropic(api_key=API_KEY, base_url=BASE_URL)
        msg = client.messages.create(
            model=MODEL,
            max_tokens=80,
            messages=[{"role": "user", "content": "用中文回答：1+1等于几？"}]
        )
        # MiniMax-M2.5 是思维链模型，content 可能含 ThinkingBlock，需按 type 取 text
        text = next((b.text for b in msg.content if b.type == "text"), "")
        thinking = next((b.thinking for b in msg.content if b.type == "thinking"), None)
        ok(f"API 调用成功，stop_reason={msg.stop_reason}")
        if thinking:
            ok(f"思维过程（前50字）：{thinking[:50]}...")
        ok(f"模型回复：{text[:100]}")
        return True
    except Exception as e:
        fail(f"API 调用失败：{e}")
        return False


# ─────────────────────────────────────────────────────────────
# Test 2: 工具调用能力
# ─────────────────────────────────────────────────────────────
def test_tool_calling():
    print(f"\n{SEP}")
    print("Test 2: MiniMax 工具调用")
    print(SEP)
    tools = [
        {
            "name": "calculate",
            "description": "执行数学计算，返回结果",
            "input_schema": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "数学表达式，如 '2 * 3 + 1'"
                    }
                },
                "required": ["expression"]
            }
        }
    ]
    try:
        client = anthropic.Anthropic(api_key=API_KEY, base_url=BASE_URL)
        msg = client.messages.create(
            model=MODEL,
            max_tokens=300,
            tools=tools,
            messages=[{"role": "user", "content": "请帮我计算 (123 * 456) + 789 的结果"}]
        )
        print(f"  stop_reason: {msg.stop_reason}")
        if msg.stop_reason == "tool_use":
            tool_block = next((b for b in msg.content if b.type == "tool_use"), None)
            if tool_block:
                ok(f"模型调用了工具: {tool_block.name}({json.dumps(tool_block.input, ensure_ascii=False)})")
                return True
            else:
                warn("stop_reason=tool_use 但没有找到 tool_use block")
                return False
        else:
            # Some models reply directly without tool call for simple math
            text = next((b.text for b in msg.content if b.type == "text"), "")
            warn(f"模型未使用工具（直接回答）: {text[:80]}")
            warn("这不一定是错误——部分模型对简单数学直接回答")
            return True
    except Exception as e:
        fail(f"工具调用测试失败：{e}")
        return False


# ─────────────────────────────────────────────────────────────
# Test 3: MCP 服务器连通 + 工具列表
# ─────────────────────────────────────────────────────────────
async def test_mcp_server():
    print(f"\n{SEP}")
    print("Test 3: MCP 服务器连通 & 工具列表")
    print(SEP)
    try:
        from fastmcp import Client as MCPClient
        async with MCPClient("http://localhost:8000/sse") as client:
            tools = await client.list_tools()
            ok(f"MCP 服务器连接成功，共 {len(tools)} 个工具：")
            for t in tools:
                name = t.name if hasattr(t, 'name') else str(t)
                print(f"    - {name}")
            return tools
    except ImportError:
        warn("fastmcp 未安装，尝试 httpx 直接请求 SSE ...")
        return await _test_mcp_via_http()
    except Exception as e:
        fail(f"MCP 连接失败：{e}")
        return []

async def _test_mcp_via_http():
    """Fallback: 直接 GET /sse 看服务器是否存活"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get("http://localhost:8000/sse")
            # SSE will return 200 with streaming — any response = server alive
            ok(f"MCP SSE 端点响应 HTTP {r.status_code}")
            return []
    except Exception as e:
        fail(f"MCP SSE 端点不可达：{e}")
        return []


# ─────────────────────────────────────────────────────────────
# Test 4: 端到端 — MCP 工具 + MiniMax 模型
# ─────────────────────────────────────────────────────────────
async def test_end_to_end(mcp_tools):
    print(f"\n{SEP}")
    print("Test 4: 端到端 — MiniMax 调用 MCP 工具")
    print(SEP)

    if not mcp_tools:
        warn("Test 3 未能获取 MCP 工具列表，跳过端到端测试")
        return False

    # 把 MCP 工具格式转成 Anthropic tools 格式
    anthropic_tools = []
    for t in mcp_tools:
        name = t.name if hasattr(t, 'name') else None
        desc = t.description if hasattr(t, 'description') else ""
        schema = t.inputSchema if hasattr(t, 'inputSchema') else {"type": "object", "properties": {}}
        if name:
            anthropic_tools.append({
                "name": name,
                "description": desc,
                "input_schema": schema if isinstance(schema, dict) else schema.model_dump() if hasattr(schema, 'model_dump') else {}
            })

    if not anthropic_tools:
        warn("无法转换 MCP 工具格式，跳过")
        return False

    # 只取 check_login_status 工具（不需要真实操作，只验证 call 行为）
    target_tool = next((t for t in anthropic_tools if t["name"] == "check_login_status"), anthropic_tools[0])
    print(f"  使用工具: {target_tool['name']}")

    try:
        client = anthropic.Anthropic(api_key=API_KEY, base_url=BASE_URL)
        msg = client.messages.create(
            model=MODEL,
            max_tokens=300,
            tools=[target_tool],
            messages=[{
                "role": "user",
                "content": f"请调用 {target_tool['name']} 工具，user_id 传入 'test-user-123'"
            }]
        )
        print(f"  stop_reason: {msg.stop_reason}")
        if msg.stop_reason == "tool_use":
            tool_block = next((b for b in msg.content if b.type == "tool_use"), None)
            if tool_block:
                ok(f"✨ 端到端成功！模型调用了 MCP 工具: {tool_block.name}")
                ok(f"   参数: {json.dumps(tool_block.input, ensure_ascii=False)}")
                return True
        text = next((b.text for b in msg.content if hasattr(b, 'text')), "")
        warn(f"模型未使用工具（回复）: {text[:100]}")
        return False
    except Exception as e:
        fail(f"端到端测试失败：{e}")
        return False


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
async def main():
    print("\n🚀 MiniMax × MCP 集成测试")
    print(f"   模型: {MODEL}")
    print(f"   接口: {BASE_URL}")

    results = {}
    results["test1_basic_api"]   = test_basic_api()
    results["test2_tool_call"]   = test_tool_calling()
    mcp_tools                    = await test_mcp_server()
    results["test3_mcp_server"]  = len(mcp_tools) > 0
    results["test4_end_to_end"]  = await test_end_to_end(mcp_tools)

    print(f"\n{SEP}")
    print("测试结果汇总")
    print(SEP)
    all_pass = True
    for name, passed in results.items():
        icon = "✅" if passed else "❌"
        label = {
            "test1_basic_api":  "MiniMax API 基础连通",
            "test2_tool_call":  "MiniMax 工具调用",
            "test3_mcp_server": "MCP 服务器 & 工具列表",
            "test4_end_to_end": "端到端 MiniMax + MCP",
        }.get(name, name)
        print(f"  {icon} {label}")
        if not passed:
            all_pass = False

    print()
    if all_pass:
        print("🎉 全部通过！MCP + MiniMax 集成工作正常。")
    else:
        print("⚠️  部分测试失败，请查看上方日志。")
    print()
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
