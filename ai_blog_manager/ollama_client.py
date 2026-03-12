from __future__ import annotations

import json
import os
from typing import Any

import requests


class OllamaError(RuntimeError):
    pass


def chat(*, prompt: str, model: str, host: str = "http://localhost:11434") -> str:
    url = f"{host.rstrip('/')}/api/chat"
    timeout_s_raw = os.getenv("OLLAMA_TIMEOUT_SECONDS", "300").strip() or "300"
    try:
        timeout_s = float(timeout_s_raw)
    except Exception:
        timeout_s = 300.0
    if timeout_s <= 0:
        timeout_s = 300.0

    body: dict[str, Any] = {
        "model": model,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": "You are a strict JSON generator. Output only a single JSON object. No markdown, no prose.",
            },
            {"role": "user", "content": prompt},
        ],
        "options": {"temperature": 0.2},
    }

    try:
        # Use separate connect/read timeouts to avoid failing long generations.
        res = requests.post(url, json=body, timeout=(10, timeout_s))
    except Exception as e:
        raise OllamaError(f"Failed to connect to Ollama at {host}: {e}") from e

    if res.status_code != 200:
        raise OllamaError(f"Ollama HTTP {res.status_code}: {res.text[:200]}")

    data = res.json()
    message = data.get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise OllamaError("Ollama response missing message.content")
    return content


def extract_json_object(text: str) -> dict[str, Any]:
    def _repair_common_json_string_issues(raw: str) -> str:
        """Repair common JSON mistakes made by LLMs.

        Focus: issues that break json.loads while trying to encode Markdown:
        - Invalid backslash escapes inside JSON strings (e.g. "\\(" or "\\_")
        - Raw newlines/tabs inside JSON strings (must be escaped as \n/\t)

        This only modifies content *inside* JSON string literals.
        """

        def _escape_control_char(ch: str) -> str:
            if ch == "\n":
                return "\\n"
            if ch == "\r":
                return "\\r"
            if ch == "\t":
                return "\\t"
            if ch == "\b":
                return "\\b"
            if ch == "\f":
                return "\\f"
            o = ord(ch)
            if o < 0x20:
                return f"\\u{o:04x}"
            return ch

        out: list[str] = []
        in_string = False
        pending_backslash = False
        valid_escapes = {"\"", "\\", "/", "b", "f", "n", "r", "t", "u"}

        for ch in raw:
            if not in_string:
                if ch == '"':
                    in_string = True
                out.append(ch)
                continue

            # in_string
            if pending_backslash:
                if ord(ch) < 0x20:
                    # Backslash followed by a raw control char is never valid JSON.
                    # Preserve the backslash literally, then escape the control char.
                    out.append("\\\\" + _escape_control_char(ch))
                    pending_backslash = False
                    continue
                if ch in valid_escapes:
                    out.append("\\" + ch)
                else:
                    # Turn invalid escape into a literal backslash.
                    out.append("\\\\" + ch)
                pending_backslash = False
                continue

            if ch == "\\":
                pending_backslash = True
                continue

            if ch == '"':
                in_string = False
                out.append(ch)
                continue

            if ord(ch) < 0x20:
                out.append(_escape_control_char(ch))
                continue

            out.append(ch)

        if pending_backslash:
            # Trailing backslash inside a string: make it a literal backslash.
            out.append("\\\\")

        return "".join(out)

    s = text.strip()
    if s.startswith("```"):
        lines = s.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        s = "\n".join(lines).strip()

    if not s.startswith("{"):
        first = s.find("{")
        last = s.rfind("}")
        if first != -1 and last != -1 and last > first:
            s = s[first : last + 1]

    try:
        obj = json.loads(s)
    except Exception as e:
        repaired = _repair_common_json_string_issues(s)
        if repaired != s:
            try:
                obj = json.loads(repaired)
            except Exception:
                raise OllamaError(f"Model did not return valid JSON: {e}") from e
        else:
            raise OllamaError(f"Model did not return valid JSON: {e}") from e

    if not isinstance(obj, dict):
        raise OllamaError("Model JSON must be an object")

    return obj
