from __future__ import annotations

import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from dotenv import load_dotenv

from .blog_posts import BlogPostError, write_post
from .chat_cli import _build_prompt, _build_repair_prompt, _coerce_tags, _derive_summary
from .git_ops import GitError, stage_commit_push
from .ollama_client import OllamaError, chat, extract_json_object
from .paths import repo_root


def _json_response(handler: BaseHTTPRequestHandler, *, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    raw = handler.rfile.read(length) if length else b""
    if not raw:
        return {}
    try:
        obj = json.loads(raw.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"Invalid JSON body: {e}") from e
    if not isinstance(obj, dict):
        raise ValueError("JSON body must be an object")
    return obj


def _create_post_from_instruction(
    *,
    instruction: str,
    model: str,
    ollama_host: str,
    overwrite: bool = False,
    git: bool = False,
    length: str | None = None,
    force_tags: list[str] | None = None,
) -> dict[str, Any]:
    length_s = (length or "").strip().lower()
    length_hint = ""
    if length_s in {"short", "medium", "long"}:
        word_ranges = {
            "short": "~600–900 words",
            "medium": "~1000–1400 words",
            "long": "~1600–2200 words",
        }
        length_hint = f"\n\nTarget length: {length_s} ({word_ranges[length_s]})."

    tags_hint = ""
    cleaned_force_tags = [t.strip() for t in (force_tags or []) if isinstance(t, str) and t.strip()]
    if cleaned_force_tags:
        tags_hint = "\n\nUse these tags (exactly): " + ", ".join(cleaned_force_tags) + "."

    prompt = _build_prompt(instruction + length_hint + tags_hint)
    raw = chat(prompt=prompt, model=model, host=ollama_host)
    try:
        payload = extract_json_object(raw)
    except OllamaError:
        repair = _build_repair_prompt(user_instruction=instruction, bad_output=raw)
        raw2 = chat(prompt=repair, model=model, host=ollama_host)
        payload = extract_json_object(raw2)

    title = str(payload.get("title") or "").strip()
    summary = str(payload.get("summary") or "").strip()
    content = str(payload.get("content") or "")
    payload_overwrite = bool(payload.get("overwrite", False))

    if not summary:
        summary = _derive_summary(title=title, content=content)

    tags_list = cleaned_force_tags if cleaned_force_tags else _coerce_tags(payload.get("tags"))

    result = write_post(
        title=title,
        tags=tags_list,
        summary=summary,
        content=content,
        overwrite=bool(overwrite or payload_overwrite),
    )

    if git and result.get("status") == "ok":
        git_result = stage_commit_push(
            repo_root=str(repo_root()),
            paths=[result["path"]],
            message=f"AI Post: {result['title']}",
        )
        result["git"] = git_result

    return result


class _Handler(BaseHTTPRequestHandler):
    server: "_AIServer"  # type: ignore[assignment]

    def log_message(self, format: str, *args: Any) -> None:
        # Keep logs terse; this runs alongside Next dev server.
        return

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") == "" or self.path.rstrip("/") == "/api/health":
            _json_response(
                self,
                status=200,
                payload={
                    "status": "ok",
                    "model": self.server.model,
                    "ollama_host": self.server.ollama_host,
                },
            )
            return

        _json_response(self, status=404, payload={"status": "error", "error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/api/create_post":
            _json_response(self, status=404, payload={"status": "error", "error": "Not found"})
            return

        try:
            body = _read_json(self)
            instruction = str(body.get("instruction") or "").strip()
            if not instruction:
                _json_response(
                    self,
                    status=400,
                    payload={"status": "error", "error": "Missing 'instruction'"},
                )
                return

            overwrite = bool(body.get("overwrite", False))
            git = bool(body.get("git", False))
            length = body.get("length")
            if length is not None and not isinstance(length, str):
                _json_response(self, status=400, payload={"status": "error", "error": "'length' must be a string"})
                return

            tags_raw = body.get("tags")
            tags_list = _coerce_tags(tags_raw)

            result = _create_post_from_instruction(
                instruction=instruction,
                model=self.server.model,
                ollama_host=self.server.ollama_host,
                overwrite=overwrite,
                git=git,
                length=length,
                force_tags=tags_list,
            )
            _json_response(self, status=200, payload=result)
        except (ValueError, json.JSONDecodeError) as e:
            _json_response(self, status=400, payload={"status": "error", "error": str(e)})
        except (BlogPostError, OllamaError, GitError) as e:
            _json_response(self, status=500, payload={"status": "error", "error": str(e)})
        except Exception as e:
            _json_response(self, status=500, payload={"status": "error", "error": f"Unexpected error: {e}"})


class _AIServer(ThreadingHTTPServer):
    def __init__(
        self,
        server_address: tuple[str, int],
        RequestHandlerClass: type[BaseHTTPRequestHandler],
        *,
        model: str,
        ollama_host: str,
    ) -> None:
        super().__init__(server_address, RequestHandlerClass)
        self.model = model
        self.ollama_host = ollama_host


def main(argv: list[str] | None = None) -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Local HTTP API for ai_blog_manager")
    parser.add_argument("--listen", default=os.getenv("AI_MANAGER_LISTEN", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("AI_MANAGER_PORT", "7337")))
    parser.add_argument("--model", default=os.getenv("OLLAMA_MODEL", "llama3.1"))
    parser.add_argument("--ollama-host", default=os.getenv("OLLAMA_HOST", "http://localhost:11434"))
    args = parser.parse_args(argv)

    httpd = _AIServer(
        (args.listen, args.port),
        _Handler,
        model=args.model,
        ollama_host=args.ollama_host,
    )

    print(f"AI manager HTTP server: http://{args.listen}:{args.port}")
    print("Endpoints: GET /api/health, POST /api/create_post")
    httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
