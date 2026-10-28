import { z } from "astro/zod";
import { siteConfig } from "../../site.config";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD");
const categoryIds = siteConfig.categories.map((c) => c.id) as [string, ...string[]];

export const compositions = ["해설", "계산", "추적", "대비", "서사"] as const;
export const titleFrames = ["결과형", "숫자형", "질문형", "대비형", "상황형", "인용형"] as const;

export const postSchema = z
  .object({
    title: z.string().min(8),
    serpTitle: z.string().min(12).max(90),
    description: z.string().min(40).max(180),
    date: dateString,
    updated: dateString,
    publishAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "publishAt은 날짜 또는 날짜와 시각").optional(),
    category: z.enum(categoryIds),
    tags: z.array(z.string().min(1)).min(1),
    sources: z
      .array(z.object({ title: z.string().min(2), url: z.string().url() }))
      .min(1),
    featured: z.boolean(),
    series: z
      .object({
        id: z.string().min(1),
        order: z.number().int().positive(),
        title: z.string().min(1),
      })
      .optional(),
    baseDate: dateString.optional(),
    applyPeriod: z
      .object({
        start: dateString,
        end: dateString,
        label: z.string().optional(),
      })
      .optional(),
    status: z.enum(["진행중", "마감"]).optional(),
    faq: z.array(z.object({ q: z.string().min(4), a: z.string().min(8) })).optional(),
    thumbnail: z.string().optional(),
    author: z.string().optional(),
    nextRound: z.object({ title: z.string().min(1), url: z.string().url() }).optional(),
    closedNote: z.string().optional(),
    구성: z.enum(compositions),
    제목틀: z.enum(titleFrames),
    검색어: z.string().min(2),
    근거: z.array(z.string().regex(/^F\d+$/)).min(1),
    thumbStyle: z.enum(["number", "question", "compare", "checklist", "timeline"]).optional(),
    thumbTitle: z.string().min(4).max(40).optional(),
    thumbNumber: z.string().max(16).optional(),
    thumbImage: z.string().optional(),
  })
  .strict();

export type PostFrontmatter = z.infer<typeof postSchema>;

export function publishDateOf(data: { date: string; publishAt?: string }): string {
  return data.publishAt ?? data.date;
}
