import type { APIContext } from "astro";
import { siteConfig, absoluteUrl } from "../../site.config";
import { allPublished, postPath } from "../lib/posts";

export async function GET(_context: APIContext) {
  const posts = await allPublished();
  const staticPages = ["/", "/roadmap/", "/about/", "/author/", "/privacy/", "/terms/", "/contact/", "/search/"];
  const urls = [
    ...staticPages.map((path) => ({ loc: absoluteUrl(path), lastmod: siteConfig.legalUpdated })),
    ...siteConfig.categories.map((category) => ({ loc: absoluteUrl(`/category/${category.id}/`), lastmod: siteConfig.legalUpdated })),
    ...posts.map((post) => ({ loc: absoluteUrl(postPath(post.id)), lastmod: post.data.updated })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
