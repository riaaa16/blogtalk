"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getAiManagerBaseUrl } from "@/lib/aiManager";

import "../../../../template/post.css";

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
    <div className="admin-ai flex-col">
      <Link id="nav" className="title" href="/" target="_self">
        Bloggu
      </Link>

      <main id="content" className="plaid flex-col">
        <div className="post-container">
          <article className="post card flex-col">
            <header className="card-header flex-col scallop">
              <p className="h1">AI Blog Post Generator</p>
              <p className="p">
                Sends your instruction to a local AI manager server at{" "}
                <code>{baseUrl}</code>.
              </p>
            </header>

            <div className="post-body">
              <form onSubmit={onSubmit} className="flex-col">
                <div className="flex-row" style={{ gap: "1rem", flexWrap: "wrap" }}>
                  <label className="flex-col" style={{ gap: "0.5rem" }} htmlFor="length">
                    <span className="h3">Length</span>
                    <select
                      id="length"
                      value={length}
                      onChange={(e) =>
                        setLength(e.target.value as "short" | "medium" | "long")
                      }
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </label>

                  <label
                    className="flex-col"
                    style={{ gap: "0.5rem", flex: "1 1 16rem", minWidth: 0 }}
                    htmlFor="tags"
                  >
                    <span className="h3">Tags</span>
                    <input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="AI, Agents, Next.js"
                      type="text"
                    />
                    <span className="p" style={{ opacity: 0.8 }}>
                      Comma-separated. If provided, these tags are forced.
                    </span>
                  </label>
                </div>

                <label className="flex-col" style={{ gap: "0.5rem" }} htmlFor="instruction">
                  <span className="h3">Prompt</span>
                  <textarea
                    id="instruction"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Example: Write a post about..."
                    rows={6}
                  />
                </label>

                <div className="flex-row" style={{ gap: "1.5rem", flexWrap: "wrap" }}>
                  <label className="flex-row" style={{ gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                    />
                    <span className="p">Overwrite if slug exists</span>
                  </label>
                  <label className="flex-row" style={{ gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={git}
                      onChange={(e) => setGit(e.target.checked)}
                    />
                    <span className="p">Git add/commit/push</span>
                  </label>
                </div>

                <button type="submit" disabled={busy || !instruction.trim()}>
                  {busy ? "Generating…" : "Generate post"}
                </button>
              </form>

              {result ? (
                <section aria-live="polite">
                  {result.status === "ok" ? (
                    <>
                      <p className="p">
                        Wrote <code>{result.path}</code>
                      </p>
                      <p className="p" style={{ opacity: 0.85 }}>
                        View:{" "}
                        <Link href={`/blog/${result.slug}`} target="_self">
                          {`/blog/${result.slug}`}
                        </Link>
                      </p>
                    </>
                  ) : (
                    <p className="p">
                      <strong>Error:</strong> {result.error}
                    </p>
                  )}
                </section>
              ) : null}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
