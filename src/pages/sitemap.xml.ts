import type { APIContext } from "astro";
import { siteConfig, absoluteUrl } from "../../site.config";
import { figuresOf } from "../infographics/catalog";
import { gitLastCommitDay, indexableCategoryIds, latestDay, postLastmod } from "../lib/lastmod";
import { allPublished, postPath } from "../lib/posts";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Image = { loc: string; caption: string };
type UrlEntry = { loc: string; lastmod?: string; images: Image[] };

/** 목록이 아닌 고정 페이지. 화면에 사이트 설정의 문구가 들어가면 그 파일도 봅니다. */
const staticPages: { path: string; sources: string[] }[] = [
  { path: "/roadmap/", sources: ["src/pages/roadmap.astro"] },
  { path: "/about/", sources: ["src/pages/about.astro"] },
  { path: "/privacy/", sources: ["src/pages/privacy.astro", "site.config.ts"] },
  { path: "/terms/", sources: ["src/pages/terms.astro"] },
  { path: "/contact/", sources: ["src/pages/contact.astro", "site.config.ts"] },
];

export async function GET(_context: APIContext) {
  const posts = await allPublished();
  const postUrls: UrlEntry[] = posts.map((post) => ({
    loc: absoluteUrl(postPath(post.id)),
    lastmod: postLastmod(post),
    images: figuresOf(post.id).map((fig) => ({
      loc: absoluteUrl(`/figures/${post.id}/${fig.id}.webp`),
      caption: fig.caption,
    })),
  }));
  const homeLastmod = latestDay(postUrls.map((url) => url.lastmod)) ?? gitLastCommitDay(["src/pages/index.astro"]);
  const withPosts = new Set(indexableCategoryIds(siteConfig.categories.map((category) => category.id), posts));
  const urls: UrlEntry[] = [
    { loc: absoluteUrl("/"), lastmod: homeLastmod, images: [] },
    ...staticPages.map((page) => ({ loc: absoluteUrl(page.path), lastmod: gitLastCommitDay(page.sources), images: [] as Image[] })),
    ...siteConfig.categories
      .filter((category) => withPosts.has(category.id))
      .map((category) => ({
        loc: absoluteUrl(`/category/${category.id}/`),
        lastmod: latestDay(posts.filter((post) => post.data.category === category.id).map((post) => postLastmod(post))),
        images: [] as Image[],
      })),
    ...postUrls,
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls
    .map((url) => {
      const images = url.images
        .map((image) => `    <image:image><image:loc>${escapeXml(image.loc)}</image:loc><image:caption>${escapeXml(image.caption)}</image:caption></image:image>`)
        .join("\n");
      const lastmod = url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : "";
      return `  <url><loc>${url.loc}</loc>${lastmod}\n${images}\n  </url>`;
    })
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
}
