import fs from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import html from "remark-html";

export type SocialLink = {
  label: string;
  href: string;
  icon: string;
  themeClass: string;
};

export type HomeContent = {
  aboutMeHtml: string;
  aboutSiteHtml: string;
  socialLinks: SocialLink[];
};

const siteContentDir = path.join(process.cwd(), "content", "site");

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid home content field '${field}'`);
  }
  return value.trim();
}

function asSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid home content field 'socialLinks'");
  }

  return value.map((v, i) => {
    if (v == null || typeof v !== "object") {
      throw new Error(`Invalid socialLinks[${i}]`);
    }
    const o = v as Record<string, unknown>;
    return {
      label: asString(o.label, `socialLinks[${i}].label`),
      href: asString(o.href, `socialLinks[${i}].href`),
      icon: asString(o.icon, `socialLinks[${i}].icon`),
      themeClass: asString(o.themeClass, `socialLinks[${i}].themeClass`),
    };
  });
}

async function markdownFileToHtml(markdownFileName: string): Promise<string> {
  const safeName = path.basename(markdownFileName);
  const fullPath = path.join(siteContentDir, safeName);
  const md = await fs.readFile(fullPath, "utf8");
  const processed = await remark().use(html).process(md);
  return processed.toString();
}

export async function getHomeContent(): Promise<HomeContent> {
  const homeJsonPath = path.join(siteContentDir, "home.json");
  const raw = await fs.readFile(homeJsonPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const aboutMeMarkdown = asString(parsed.aboutMeMarkdown, "aboutMeMarkdown");
  const aboutSiteMarkdown = asString(
    parsed.aboutSiteMarkdown,
    "aboutSiteMarkdown",
  );
  const socialLinks = asSocialLinks(parsed.socialLinks);

  const [aboutMeHtml, aboutSiteHtml] = await Promise.all([
    markdownFileToHtml(aboutMeMarkdown),
    markdownFileToHtml(aboutSiteMarkdown),
  ]);

  return {
    aboutMeHtml,
    aboutSiteHtml,
    socialLinks,
  };
}
