import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig } from "../../site.config";
import { allPublished, postPath } from "../lib/posts";

export async function GET(context: APIContext) {
  const posts = await allPublished();
  return rss({
    title: siteConfig.name,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(`${post.data.updated}T00:00:00+09:00`),
      link: postPath(post.id),
      author: siteConfig.author.name,
    })),
  });
}
