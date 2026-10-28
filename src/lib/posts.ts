import { getCollection, type CollectionEntry } from "astro:content";
import { siteConfig } from "../../site.config";
import { seoulToday } from "./dates";

export type PostEntry = CollectionEntry<"posts">;

export function publishDate(post: PostEntry): string {
  return post.data.publishAt ?? post.data.date;
}

export async function allPublished(): Promise<PostEntry[]> {
  const today = seoulToday();
  const posts = await getCollection("posts");
  return posts
    .filter((post) => publishDate(post) <= today)
    .sort((a, b) => publishDate(b).localeCompare(publishDate(a)) || b.data.date.localeCompare(a.data.date));
}

export function postPath(id: string): string {
  return `/${id}/`;
}

export function categoryPath(id: string): string {
  return `/category/${id}/`;
}

export function readingMinutes(text: string): number {
  const chars = text.replace(/\s/g, "").length;
  return Math.max(1, Math.round(chars / 450));
}

export function relatedPosts(post: PostEntry, posts: PostEntry[]): PostEntry[] {
  return posts
    .filter((item) => item.id !== post.id)
    .map((item) => {
      const sameCategory = item.data.category === post.data.category ? 2 : 0;
      const shared = item.data.tags.filter((tag) => post.data.tags.includes(tag)).length;
      return { item, score: sameCategory + shared };
    })
    .sort((a, b) => b.score - a.score || publishDate(b.item).localeCompare(publishDate(a.item)))
    .slice(0, 3)
    .map((row) => row.item);
}

export function seriesMates(post: PostEntry, posts: PostEntry[]): PostEntry[] {
  if (!post.data.series) return [];
  const id = post.data.series.id;
  return posts
    .filter((item) => item.data.series?.id === id)
    .sort((a, b) => (a.data.series?.order ?? 0) - (b.data.series?.order ?? 0));
}

export function authorName(post: PostEntry): string {
  return post.data.author ?? siteConfig.author.name;
}
