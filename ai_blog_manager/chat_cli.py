from __future__ import annotations

import argparse
import json
import os
import re
import sys

from dotenv import load_dotenv

from .blog_posts import BlogPostError, write_post
from .git_ops import GitError, stage_commit_push
from .ollama_client import OllamaError, chat, extract_json_object
from .paths import repo_root


def _coerce_tags(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        out: list[str] = []
        for v in value:
            if not isinstance(v, str):
                continue
            t = v.strip()
            if t:
                out.append(t)
        return out
    if isinstance(value, str):
        parts = re.split(r"[,;]", value)
        cleaned = [p.strip().rstrip(".") for p in parts]
        return [c for c in cleaned if c]
    return []


def _strip_basic_markdown(text: str) -> str:
    s = text
    s = re.sub(r"^\s{0,3}#{1,6}\s+", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*>\s?", "", s, flags=re.MULTILINE)
    s = re.sub(r"^\s*(?:[-*+]\s+|\d+\.\s+)", "", s, flags=re.MULTILINE)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", s)
    s = re.sub(r"[*_]{1,3}([^*_]+)[*_]{1,3}", r"\1", s)
    return s


def _derive_summary(*, title: str, content: str) -> str:
    raw = (content or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if raw:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", raw) if p.strip()]
        for p in paragraphs:
            cleaned = _strip_basic_markdown(p).strip()
            cleaned = re.sub(r"\s+", " ", cleaned)
            if cleaned:
                return (cleaned[:157] + "...") if len(cleaned) > 160 else cleaned

    t = (title or "").strip()
    return t if t else "Untitled post"


def _build_prompt(user_instruction: str) -> str:
    return (
        "Convert the instruction into a blog post payload. Return ONLY JSON.\n\n"
        "Payload schema:\n"
        "{\n"
        "  \"title\": string,\n"
        "  \"tags\": string[],\n"
        "  \"summary\": string,\n"
        "  \"content\": string (Markdown),\n"
        "  \"overwrite\": boolean (optional; default false)\n"
        "}\n\n"
        "Rules:\n"
        "- Do NOT include frontmatter. The tool will add it.\n"
        "- Keep content as clean Markdown.\n"
        "- summary is REQUIRED (1-2 sentences).\n"
        "- Do NOT double-escape newlines (avoid literal \\\\n in the string).\n"
        "  Use normal JSON escaping so the parsed string contains real newlines.\n\n"
        f"Instruction: {user_instruction}\n"
    )


def _build_repair_prompt(*, user_instruction: str, bad_output: str) -> str:
    return (
        "You returned invalid JSON previously. Repair it.\n"
        "Return ONLY a single valid JSON object. No markdown, no prose.\n\n"
        "JSON schema:\n"
        "{\n"
        "  \"title\": string,\n"
        "  \"tags\": string[],\n"
        "  \"summary\": string,\n"
        "  \"content\": string,\n"
        "  \"overwrite\": boolean\n"
        "}\n\n"
        f"Original instruction: {user_instruction}\n\n"
        "Bad output to repair (verbatim):\n"
        f"{bad_output}\n"
    )


def main(argv: list[str] | None = None) -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Local AI blog manager (writes /content/posts)")
    parser.add_argument("--model", default=os.getenv("OLLAMA_MODEL", "llama3.1"))
    parser.add_argument("--host", default=os.getenv("OLLAMA_HOST", "http://localhost:11434"))
    parser.add_argument("--git", action="store_true", help="git add/commit/push post changes")
    parser.add_argument("--no-llm", action="store_true", help="paste payload JSON manually")
    args = parser.parse_args(argv)

    print("AI blog manager (local). Type 'exit' to quit.", file=sys.stderr)

    while True:
        try:
            user = input("> ").strip()
        except EOFError:
            break

        if not user:
            continue
        if user.lower() in {"exit", "quit"}:
            break

        try:
            if args.no_llm:
                payload = json.loads(user)
            else:
                prompt = _build_prompt(user)
                raw = chat(prompt=prompt, model=args.model, host=args.host)
                try:
                    payload = extract_json_object(raw)
                except OllamaError:
                    print("Model output wasn't valid JSON; retrying once...", file=sys.stderr)
                    repair = _build_repair_prompt(user_instruction=user, bad_output=raw)
                    raw2 = chat(prompt=repair, model=args.model, host=args.host)
                    payload = extract_json_object(raw2)

            if not isinstance(payload, dict):
                raise BlogPostError("Payload must be a JSON object")

            title = payload.get("title")
            summary = payload.get("summary")
            content = payload.get("content")
            overwrite = bool(payload.get("overwrite", False))

            title_s = str(title or "").strip()
            content_s = str(content or "")
            summary_s = str(summary or "").strip()
            if not summary_s:
                summary_s = _derive_summary(title=title_s, content=content_s)

            tags_list = _coerce_tags(payload.get("tags"))

            result = write_post(
                title=title_s,
                tags=tags_list,
                summary=summary_s,
                content=content_s,
                overwrite=overwrite,
            )
            print(json.dumps(result, indent=2), file=sys.stderr)

            if args.git and result.get("status") == "ok":
                rel_path = result["path"]
                git_result = stage_commit_push(
                    repo_root=str(repo_root()),
                    paths=[rel_path],
                    message=f"AI Post: {result['title']}",
                )
                print(json.dumps({"git": git_result}, indent=2), file=sys.stderr)

        except (BlogPostError, OllamaError, GitError, json.JSONDecodeError) as e:
            print(f"Error: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Unexpected error: {e}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
