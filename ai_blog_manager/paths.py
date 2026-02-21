from __future__ import annotations

from pathlib import Path


def repo_root() -> Path:
    # ai_blog_manager/paths.py -> repo root
    return Path(__file__).resolve().parents[1]


def posts_root() -> Path:
    return repo_root() / "content" / "posts"
