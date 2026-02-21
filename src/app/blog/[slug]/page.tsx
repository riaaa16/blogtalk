import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const postsDir = path.join(process.cwd(), "content", "posts");
  if (!fs.existsSync(postsDir)) return [];

  const mdFiles = fs
    .readdirSync(postsDir)
    .filter((f) => f.toLowerCase().endsWith(".md"));

  const slugs: string[] = [];
  for (const fileName of mdFiles) {
    const full = path.join(postsDir, fileName);
    const raw = fs.readFileSync(full, "utf8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (slug) slugs.push(slug);
  }

  return Array.from(new Set(slugs)).map((slug) => ({ slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  return (
    <main className="container">
      <h1>{post.title}</h1>
      <p className="muted">{post.date}</p>
      <article className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
    </main>
  );
}
