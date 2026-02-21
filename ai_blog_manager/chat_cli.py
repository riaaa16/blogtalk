from __future__ import annotations

import argparse
import json
import os
import sys

from dotenv import load_dotenv

from .blog_posts import BlogPostError, write_post
from .git_ops import GitError, stage_commit_push
from .ollama_client import OllamaError, chat, extract_json_object
from .paths import repo_root


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
        "- Keep content as clean Markdown.\n\n"
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
            tags = payload.get("tags")
            summary = payload.get("summary")
            content = payload.get("content")
            overwrite = bool(payload.get("overwrite", False))

            result = write_post(
                title=str(title or ""),
                tags=tags if isinstance(tags, list) else [],
                summary=str(summary or ""),
                content=str(content or ""),
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
