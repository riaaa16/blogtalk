from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

_repo_root = Path(__file__).resolve().parents[1]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from ai_blog_manager.blog_posts import BlogPostError, write_post
from ai_blog_manager.git_ops import GitError, stage_commit_push
from ai_blog_manager.paths import repo_root


mcp = FastMCP("blogtalk")


def _unwrap_inspector_args(arg: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(arg, dict):
        return arg
    if "payload" in arg and "title" not in arg and len(arg.keys()) == 1:
        inner = arg.get("payload")
        if isinstance(inner, dict):
            return inner
    return arg


@mcp.tool()
def create_blog_post(payload: dict[str, Any]) -> dict[str, Any]:
    """Create a Markdown blog post in /content/posts.

    Input:
      {
        "title": "...",
        "tags": [...],
        "content": "...",
        "summary": "...",
        "overwrite": false
      }
    """

    payload = _unwrap_inspector_args(payload)
    if not isinstance(payload, dict):
        return {"status": "error", "error": "Payload must be an object"}

    try:
        result = write_post(
            title=str(payload.get("title") or ""),
            tags=payload.get("tags") if isinstance(payload.get("tags"), list) else [],
            summary=str(payload.get("summary") or ""),
            content=str(payload.get("content") or ""),
            overwrite=bool(payload.get("overwrite", False)),
        )
    except BlogPostError as e:
        return {"status": "error", "error": str(e)}
    except Exception as e:
        return {"status": "error", "error": f"Unexpected error: {e}"}

    if os.getenv("AUTO_GIT_PUSH", "").strip() in {"1", "true", "TRUE", "yes", "YES"}:
        try:
            git_result = stage_commit_push(
                repo_root=str(repo_root()),
                paths=[result["path"]],
                message=f"AI Post: {result['title']}",
            )
            result["git"] = git_result
        except GitError as e:
            result["git"] = {"status": "error", "error": str(e)}

    return result


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
