import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>Blogtalk</h1>
      <p className="muted">Static Next.js blog (GitHub Pages compatible).</p>
      <p>
        <Link href="/blog">Go to blog</Link>
      </p>
    </main>
  );
}
