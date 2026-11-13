import { execFileSync } from "node:child_process";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface DatedFrontmatter {
  updated?: string;
  updatedAt?: string;
  publishAt?: string;
  date?: string;
}

/** YYYY-MM-DD만 받습니다. 형식이 아니면 날짜를 만들지 않습니다. */
export function dayOf(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const day = value.slice(0, 10);
  return DAY.test(day) ? day : undefined;
}

/**
 * 글의 수정일. updated 또는 updatedAt이 있으면 그 날짜,
 * 없으면 발행일(publishAt, 없으면 date). 둘 다 없으면 undefined.
 */
export function frontmatterLastmod(data: DatedFrontmatter): string | undefined {
  return dayOf(data.updated) ?? dayOf(data.updatedAt) ?? dayOf(data.publishAt) ?? dayOf(data.date);
}

export function latestDay(values: Iterable<string | undefined | null>): string | undefined {
  let latest: string | undefined;
  for (const value of values) {
    const day = dayOf(value);
    if (!day) continue;
    if (!latest || day > latest) latest = day;
  }
  return latest;
}

/** 경로들의 마지막 커밋 날짜. 이력이 없으면 undefined. */
export function gitLastCommitDay(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...paths], {
      encoding: "utf8",
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return dayOf(out);
  } catch {
    return undefined;
  }
}

export function postLastmod(post: { id: string; filePath?: string; data: DatedFrontmatter }): string | undefined {
  const fromFrontmatter = frontmatterLastmod(post.data);
  if (fromFrontmatter) return fromFrontmatter;
  const path = post.filePath || `src/content/posts/${post.id}.mdx`;
  return gitLastCommitDay([path]);
}

/** 발행된 글이 하나 이상인 분류만, 설정 순서를 유지합니다. */
export function indexableCategoryIds(categoryIds: readonly string[], posts: readonly { data: { category: string } }[]): string[] {
  const counts = new Map<string, number>();
  for (const post of posts) counts.set(post.data.category, (counts.get(post.data.category) ?? 0) + 1);
  return categoryIds.filter((id) => (counts.get(id) ?? 0) > 0);
}
