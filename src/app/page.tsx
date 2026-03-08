import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "error";

export default async function HomePage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  const posts = await getAllPosts();

  return (
    <div className="flex-col h-100">
      <Link id="nav" className="title" href="/" target="_self">
        Bloggu
      </Link>

      <div id="home" className="flex-row">
        <div id="posts" className="flex-col h-100 plaid">
          <p className="h1">Blog Posts</p>

          <div className="cards-frame flex-col">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="cardLink">
                <div className="card flex-col">
                  <div className="card-header flex-col h-100 scallop">
                    <p className="h2">{p.title}</p>
                    <div className="tags flex-row">
                      {p.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <p className="p">{p.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div id="info" className="flex-col h-100">
          <div id="about-me" className="flex-col">
            <p className="h3">
              About Me{" "}
              <img
                className="deco right"
                src={`${basePath}/images/star.png`}
                alt=""
                aria-hidden="true"
              />
            </p>
            <div className="body flex-col">
              <p>
                Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque
                faucibus ex sapien vitae pellentesque sem placerat. In id cursus
                mi pretium tellus duis convallis. Tempus leo eu aenean sed diam
                urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum
                egestas. Iaculis massa nisl malesuada lacinia integer nunc
                posuere. Ut hendrerit semper vel class aptent taciti sociosqu.
                Ad litora torquent per conubia nostra inceptos himenaeos.
              </p>
            </div>
          </div>

          <div id="about-site" className="flex-col">
            <p className="h3">
              <img
                className="deco left"
                src={`${basePath}/images/orange.png`}
                alt=""
                aria-hidden="true"
              />
              How This Website Works
            </p>
            <div className="body flex-col">
              <p>This blog is hosted with Next.js, on GitHub Pages.</p>
              <p>
                Blog posts are generated using a Python CLI tool or a locally
                hosted-page. The website owner prompts a local LLM to write blog
                posts, which can then be automatically committed and pushed to
                the website with use of GitHub PATs.
              </p>
            </div>
          </div>

          <div id="socials" className="flex-col">
            <p className="h3">
              Social Links{" "}
              <img
                className="deco right"
                src={`${basePath}/images/lime.png`}
                alt=""
                aria-hidden="true"
              />
            </p>
            <div id="links" className="flex-row">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-linkedin blue"></i>
                <span>LinkedIn</span>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-github pink"></i>
                <span>GitHub</span>
              </a>
              <a href="https://portfolio.com" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-journal-code yellow"></i>
                <span>Portfolio</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
