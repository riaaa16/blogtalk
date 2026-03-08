import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug } from "@/lib/posts";

import "../../../../template/post.css";

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

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  const prettyDate = (() => {
    const d = new Date(post.date);
    if (Number.isNaN(d.getTime())) return post.date;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  })();

  return (
    <div className="flex-col">
      <Link id="nav" className="title" href="/" target="_self">
        Bloggu
      </Link>

      <main id="content" className="plaid flex-col">
        <div className="post-container">
          <img
            className="pushpin"
            src={`${basePath}/images/pushpin.png`}
            alt=""
            aria-hidden="true"
          />

          <article className="post card flex-col">
            <header className="card-header flex-col scallop">
              <div className="post-title-row flex-row">
                <p className="h1">{post.title}</p>
              </div>
              <p className="h3 post-date">{prettyDate}</p>
              <div className="tags flex-row">
                {post.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </header>

            <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />
          </article>
        </div>
      </main>
    </div>
  );
}
