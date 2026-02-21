import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

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

    const processed = await remark().use(html).process(parsed.content);
    return {
      ...meta,
      markdown: parsed.content,
      html: processed.toString(),
      sourcePath: path.relative(process.cwd(), full),
    };
  }

  return null;
}
