import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getHomeContent } from "@/lib/homeContent";

export const dynamic = "error";

export default async function BlogIndexPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
  const posts = await getAllPosts();
  const home = await getHomeContent();

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
            <div
              className="body flex-col"
              dangerouslySetInnerHTML={{ __html: home.aboutMeHtml }}
            />
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
            <div
              className="body flex-col"
              dangerouslySetInnerHTML={{ __html: home.aboutSiteHtml }}
            />
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
              {home.socialLinks.map((l) => (
                <a key={l.href} href={l.href} rel="noopener noreferrer">
                  <i className={`bi ${l.icon} ${l.themeClass}`}></i>
                  <span>{l.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
