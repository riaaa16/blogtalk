"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getAiManagerBaseUrl } from "@/lib/aiManager";

import "../../../../template/post.css";

type ApiOk = {
  status: "ok";
  path: string;
  slug: string;
  view?: string;
  title: string;
  date: string;
  git?: unknown;
  messages?: string[];
};

type ApiErr = {
  status: "error";
  error: string;
};

type ApiResponse = ApiOk | ApiErr;

type Toast =
  | { id: string; type: "success"; path: string; view: string }
  | { id: string; type: "error"; message: string };

type ToastInput =
  | { type: "success"; path: string; view: string }
  | { type: "error"; message: string };

export const dynamic = "error";

export default function AiAdminPage() {
  const baseUrl = useMemo(() => getAiManagerBaseUrl(), []);
  const [toastPreview, setToastPreview] = useState(false);
  const toastTimersRef = useRef<Record<string, number>>({});

  const [instruction, setInstruction] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [tags, setTags] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [git, setGit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return () => {
      for (const id of Object.keys(toastTimersRef.current)) {
        window.clearTimeout(toastTimersRef.current[id]);
      }
      toastTimersRef.current = {};
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete toastTimersRef.current[id];
    }
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const nextToast: Toast =
        toast.type === "success"
          ? { id, type: "success", path: toast.path, view: toast.view }
          : { id, type: "error", message: toast.message };

      setToasts((curr) => [nextToast, ...curr].slice(0, 3));

      if (toastTimersRef.current[id]) {
        window.clearTimeout(toastTimersRef.current[id]);
      }
      toastTimersRef.current[id] = window.setTimeout(() => {
        dismissToast(id);
      }, 8000);
    },
    [dismissToast],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    try {
      const params = new URLSearchParams(window.location.search);
      setToastPreview(params.get("toastPreview") === "1");
    } catch {
      setToastPreview(false);
    }
  }, []);

  useEffect(() => {
    if (!toastPreview) return;
    if (process.env.NODE_ENV === "production") return;
    addToast({
      type: "success",
      path: "content/posts/2026-03-12-toast-preview.md",
      view: "/blog/toast-preview",
    });
    addToast({
      type: "error",
      message: "Model did not return valid JSON: Invalid \\\\escape at char 715",
    });
  }, [toastPreview]);

  function parseTags(value: string): string[] {
    return value
      .split(/[,;\n]/g)
      .map((t) => t.trim().replace(/\.$/, ""))
      .filter(Boolean);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

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
      if (data.status === "ok") {
        const view = data.view?.trim() || `/blog/${data.slug}`;
        addToast({ type: "success", path: data.path, view });
      } else {
        addToast({ type: "error", message: data.error });
      }
    } catch (err) {
      addToast({
        type: "error",
        message:
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

      {toasts.length ? (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast${t.type === "error" ? " toast--error" : ""}`}
              role="status"
            >
              <div className="toast-body flex-col">
                {t.type === "success" ? (
                  <>
                    <p className="p">
                      Wrote <code>{t.path}</code>
                    </p>
                    <p className="p" style={{ opacity: 0.85 }}>
                      View:{" "}
                      <Link href={t.view} target="_self">
                        {t.view}
                      </Link>
                    </p>
                  </>
                ) : (
                  <p className="p">
                    <strong>Error:</strong> {t.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

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
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
