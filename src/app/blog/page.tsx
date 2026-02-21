import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "error";

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <main className="container">
      <h1>Blog</h1>
      <p className="muted">Newest posts first.</p>

      {posts.length === 0 ? (
        <p>No posts yet. Add Markdown files under /content/posts.</p>
      ) : (
        <div className="postList">
          {posts.map((p) => (
            <article key={p.slug} className="postCard">
              <h2>
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </h2>
              <div className="postMeta muted">
                <span>{p.date}</span>
              </div>
              <p>{p.summary}</p>
              {p.tags.length > 0 ? (
                <div className="tags">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
