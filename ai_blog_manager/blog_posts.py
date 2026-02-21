from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import yaml

from .paths import posts_root, repo_root


class BlogPostError(RuntimeError):
    pass


@dataclass(frozen=True)
class PostFrontmatter:
    title: str
    date: str
    tags: list[str]
    summary: str
    slug: str


_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(title: str) -> str:
    s = title.strip().lower()
    s = _slug_re.sub("-", s)
    s = s.strip("-")
    return s


def _split_frontmatter(md: str) -> tuple[str, str]:
    s = md.lstrip("\ufeff")
    if not s.startswith("---\n"):
        raise BlogPostError("Missing YAML frontmatter starting with '---'")
    parts = s.split("\n---\n", 1)
    if len(parts) != 2:
        raise BlogPostError("Frontmatter must end with a '---' line")
    fm = parts[0][4:]
    body = parts[1]
    return fm, body


def parse_frontmatter(md: str) -> PostFrontmatter:
    fm_text, _ = _split_frontmatter(md)
    try:
        data = yaml.safe_load(fm_text) or {}
    except Exception as e:
        raise BlogPostError(f"Invalid YAML frontmatter: {e}") from e

    if not isinstance(data, dict):
        raise BlogPostError("Frontmatter must be a YAML mapping")

    def req_str(key: str) -> str:
        v = data.get(key)
        if not isinstance(v, str) or not v.strip():
            raise BlogPostError(f"Frontmatter '{key}' must be a non-empty string")
        return v.strip()

    def opt_tags(key: str) -> list[str]:
        v = data.get(key)
        if v is None:
            return []
        if not isinstance(v, list) or any(not isinstance(x, str) for x in v):
            raise BlogPostError("Frontmatter 'tags' must be a string[]")
        return [x.strip() for x in v if x.strip()]

    return PostFrontmatter(
        title=req_str("title"),
        date=req_str("date"),
        tags=opt_tags("tags"),
        summary=req_str("summary"),
        slug=req_str("slug"),
    )


def build_markdown(*, title: str, tags: list[str], summary: str, slug: str, body: str, post_date: str) -> str:
    fm: dict[str, Any] = {
        "title": title,
        "date": post_date,
        "tags": tags,
        "summary": summary,
        "slug": slug,
    }

    fm_yaml = yaml.safe_dump(
        fm,
        sort_keys=False,
        allow_unicode=True,
        width=88,
        default_flow_style=False,
    ).strip()

    body_clean = (body or "").strip() + "\n"
    return f"---\n{fm_yaml}\n---\n\n{body_clean}"


def list_existing_slugs() -> dict[str, Path]:
    root = posts_root()
    if not root.exists():
        return {}

    out: dict[str, Path] = {}
    for p in sorted(root.glob("*.md")):
        try:
            fm = parse_frontmatter(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if fm.slug and fm.slug not in out:
            out[fm.slug] = p
    return out


def write_post(*, title: str, tags: list[str], summary: str, content: str, overwrite: bool = False) -> dict[str, Any]:
    if not isinstance(title, str) or not title.strip():
        raise BlogPostError("title is required")
    if not isinstance(summary, str) or not summary.strip():
        raise BlogPostError("summary is required")
    if tags is None:
        tags = []
    if not isinstance(tags, list) or any(not isinstance(t, str) for t in tags):
        raise BlogPostError("tags must be a list of strings")

    post_slug = slugify(title)
    if not post_slug:
        raise BlogPostError("Could not generate slug from title")

    post_date = date.today().isoformat()
    file_name = f"{post_date}-{post_slug}.md"

    root = posts_root()
    root.mkdir(parents=True, exist_ok=True)

    existing = list_existing_slugs()
    if post_slug in existing and not overwrite:
        raise BlogPostError(f"Slug already exists: {post_slug}. Set overwrite=true to replace.")

    target = existing.get(post_slug) or (root / file_name)
    if target.exists() and not overwrite and target not in existing.values():
        raise BlogPostError(f"Post file already exists: {target.name}. Set overwrite=true to replace.")

    md = build_markdown(
        title=title.strip(),
        tags=[t.strip() for t in tags if t.strip()],
        summary=summary.strip(),
        slug=post_slug,
        body=content or "",
        post_date=post_date,
    )

    _ = parse_frontmatter(md)

    target.write_text(md, encoding="utf-8", newline="\n")
    rel = target.relative_to(repo_root())

    return {
        "status": "ok",
        "path": str(rel).replace("\\", "/"),
        "slug": post_slug,
        "title": title.strip(),
        "date": post_date,
    }
