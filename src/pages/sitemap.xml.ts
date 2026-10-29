import type { APIContext } from "astro";
import { siteConfig, absoluteUrl } from "../../site.config";
import { figuresOf } from "../infographics/catalog";
import { allPublished, postPath } from "../lib/posts";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(_context: APIContext) {
  const posts = await allPublished();
  const staticPages = ["/", "/roadmap/", "/about/", "/author/", "/privacy/", "/terms/", "/contact/", "/search/"];
  const urls = [
    ...staticPages.map((path) => ({ loc: absoluteUrl(path), lastmod: siteConfig.legalUpdated, images: [] as { loc: string; caption: string }[] })),
    ...siteConfig.categories.map((category) => ({ loc: absoluteUrl(`/category/${category.id}/`), lastmod: siteConfig.legalUpdated, images: [] as { loc: string; caption: string }[] })),
    ...posts.map((post) => ({
      loc: absoluteUrl(postPath(post.id)),
      lastmod: post.data.updated,
      images: figuresOf(post.id).map((fig) => ({
        loc: absoluteUrl(`/figures/${post.id}/${fig.id}.webp`),
        caption: fig.caption,
      })),
    })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls
    .map((url) => {
      const images = url.images
        .map((image) => `    <image:image><image:loc>${escapeXml(image.loc)}</image:loc><image:caption>${escapeXml(image.caption)}</image:caption></image:image>`)
        .join("\n");
      return `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod>\n${images}\n  </url>`;
    })
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
