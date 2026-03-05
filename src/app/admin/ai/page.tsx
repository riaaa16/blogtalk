"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getAiManagerBaseUrl } from "@/lib/aiManager";

type ApiOk = {
  status: "ok";
  path: string;
  slug: string;
  title: string;
  date: string;
  git?: unknown;
};

type ApiErr = {
  status: "error";
  error: string;
};

type ApiResponse = ApiOk | ApiErr;

export const dynamic = "error";

export default function AiAdminPage() {
  const baseUrl = useMemo(() => getAiManagerBaseUrl(), []);

  const [instruction, setInstruction] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [tags, setTags] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [git, setGit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  function parseTags(value: string): string[] {
    return value
      .split(/[,;\n]/g)
      .map((t) => t.trim().replace(/\.$/, ""))
      .filter(Boolean);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const trimmed = instruction.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/create_post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: trimmed,
          length,
          tags: parseTags(tags),
          overwrite,
          git,
        }),
      });

      const data = (await res.json()) as ApiResponse;
      setResult(data);
    } catch (err) {
      setResult({
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "Failed to reach local AI manager server",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>AI Blog Post Generator</h1>
      <p className="muted">
        Sends your instruction to a local AI manager server at{" "}
        <code>{baseUrl}</code>.
      </p>

      <form onSubmit={onSubmit} className="form">
        <div className="formRow formRowTop">
          <div className="field fieldNarrow">
            <label className="label" htmlFor="length">
              Length
            </label>
            <select
              id="length"
              className="select"
              value={length}
              onChange={(e) => setLength(e.target.value as "short" | "medium" | "long")}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>

          <div className="field fieldGrow">
            <label className="label" htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="AI, Agents, Next.js"
              type="text"
            />
            <div className="muted helpText">
              Comma-separated. If provided, these tags are forced.
            </div>
          </div>
        </div>

        <label className="label" htmlFor="instruction">
          Prompt
        </label>
        <textarea
          id="instruction"
          className="textarea"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Example: Write a post about..."
          rows={5}
        />

        <div className="formRow">
          <label className="check">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            Overwrite if slug exists
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={git}
              onChange={(e) => setGit(e.target.checked)}
            />
            Git add/commit/push
          </label>
        </div>

        <button className="button" type="submit" disabled={busy || !instruction.trim()}>
          {busy ? "Generating…" : "Generate post"}
        </button>
      </form>

      {result ? (
        <section className="resultBox" aria-live="polite">
          {result.status === "ok" ? (
            <>
              <p>
                Wrote <code>{result.path}</code>
              </p>
              <p className="muted">
                View: <Link href={`/blog/${result.slug}`}>{`/blog/${result.slug}`}</Link>
              </p>
            </>
          ) : (
            <p>
              <strong>Error:</strong> {result.error}
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}
