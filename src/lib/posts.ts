import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import remarkGfm from "remark-gfm";

export type PostMeta = {
  title: string;
  date: string;
  tags: string[];
  summary: string;
  slug: string;
};

export type Post = PostMeta & {
  markdown: string;
  html: string;
  sourcePath: string;
};

const postsDir = path.join(process.cwd(), "content", "posts");

const tableThemes = ["pink", "yellow", "blue"] as const;
type TableTheme = (typeof tableThemes)[number];

function hashToIndex(input: string): number {
  // Deterministic, fast hash (djb2-ish) to pick a "random" theme.
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

function decorateTables(renderedHtml: string, seed: string): string {
  let tableIndex = 0;
  return renderedHtml.replace(/<table(\s[^>]*)?>/g, (match, attrs) => {
    const existingAttrs = typeof attrs === "string" ? attrs : "";
    if (/\bdata-table-theme\s*=/.test(existingAttrs)) return match;

    const theme = tableThemes[
      hashToIndex(`${seed}#table-${tableIndex++}`) % tableThemes.length
    ] as TableTheme;

    return `<table${existingAttrs} data-table-theme="${theme}">`;
  });
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid frontmatter field '${field}'`);
  }
  return value.trim();
}

function asStringArray(value: unknown, field: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new Error(`Invalid frontmatter field '${field}' (must be string[])`);
  }
  return value.map((v) => v.trim()).filter(Boolean);
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

export async function getAllPosts(): Promise<PostMeta[]> {
  if (!(await dirExists(postsDir))) return [];

  const entries = await fs.readdir(postsDir);
  const mdFiles = entries.filter((f) => f.toLowerCase().endsWith(".md"));
  const metas: PostMeta[] = [];

  for (const fileName of mdFiles) {
    const full = path.join(postsDir, fileName);
    const raw = await fs.readFile(full, "utf8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;

    metas.push({
      title: asString(data.title, "title"),
      date: asString(data.date, "date"),
      tags: asStringArray(data.tags, "tags"),
      summary: asString(data.summary, "summary"),
      slug: asString(data.slug, "slug"),
    });
  }

  metas.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return metas;
}

export async function getAllPostSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  const slugs = posts.map((p) => p.slug);
  return Array.from(new Set(slugs));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getAllPosts();
  const meta = posts.find((p) => p.slug === slug);
  if (!meta) return null;

  const entries = await fs.readdir(postsDir);
  const mdFiles = entries.filter((f) => f.toLowerCase().endsWith(".md"));

  for (const fileName of mdFiles) {
    const full = path.join(postsDir, fileName);
    const raw = await fs.readFile(full, "utf8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    const thisSlug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (thisSlug !== slug) continue;

    const processed = await remark().use(remarkGfm).use(html).process(parsed.content);
    const rendered = decorateTables(processed.toString(), slug);
    return {
      ...meta,
      markdown: parsed.content,
      html: rendered,
      sourcePath: path.relative(process.cwd(), full),
    };
  }

  return null;
}
