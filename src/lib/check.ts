import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { postSchema, publishDateOf, type PostFrontmatter } from "./post-schema";
import glossary from "../data/glossary.json";

export interface Fact {
  id: string;
  value: string;
  source: string;
  checkedAt: string;
  note?: string;
}

export interface LoadedPost {
  id: string;
  file: string;
  data: PostFrontmatter;
  body: string;
  raw: string;
}

export interface CheckIssue {
  level: "error" | "info";
  file: string;
  message: string;
}

const BANNED_PATH = "rules/banned.yaml";

interface BannedRule {
  phrase?: string;
  pattern?: string;
  reason: string;
}

const STRUCTURAL_KEYS = new Set(["date", "updated", "publishAt", "featured", "series"]);

export function loadBanned(root = process.cwd()): BannedRule[] {
  const file = path.join(root, BANNED_PATH);
  return parseYaml(readFileSync(file, "utf8")) as BannedRule[];
}

export function stripIgnored(text: string): string {
  let s = text;
  s = s.replace(/<!--\s*예시:start\s*-->[\s\S]*?<!--\s*예시:end\s*-->/g, " ");
  s = s.replace(/<(?:Calculator|WorkedExample)\b[^>]*\bexample\b[^>]*\/>/g, " ");
  s = s.replace(/<(?:Calculator|WorkedExample)\b[^>]*\bexample\b[^>]*>[\s\S]*?<\/(?:Calculator|WorkedExample)>/g, " ");
  s = s.replace(/https?:\/\/[^\s)]+/g, " ");
  s = s.replace(/^\s*\d+\.\s+/gm, "");
  s = s.replace(/\d+\s*가지/g, " ");
  return s;
}

export function numberTokens(text: string): string[] {
  const found = stripIgnored(text).match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [];
  return found.map((n) => n.replace(/,/g, ""));
}

export function claimText(data: PostFrontmatter, body: string): string {
  const chunks = [
    data.title,
    data.serpTitle,
    data.description,
    data.baseDate ?? "",
    data.closedNote ?? "",
    data.applyPeriod ? `${data.applyPeriod.start} ${data.applyPeriod.end} ${data.applyPeriod.label ?? ""}` : "",
    ...(data.faq ?? []).flatMap((f) => [f.q, f.a]),
    data.thumbNumber ?? "",
    body,
  ];
  return chunks.join("\n");
}

export function factTokens(facts: Fact[]): Set<string> {
  const set = new Set<string>();
  for (const fact of facts) {
    for (const token of numberTokens(`${fact.value}\n${fact.note ?? ""}`)) set.add(token);
  }
  return set;
}

export function missingNumbers(text: string, facts: Fact[]): string[] {
  const allowed = factTokens(facts);
  const missing = new Set<string>();
  for (const token of numberTokens(text)) {
    if (!allowed.has(token)) missing.add(token);
  }
  return [...missing];
}

export function findBanned(text: string, rules: BannedRule[]): { rule: BannedRule; hit: string }[] {
  const hits: { rule: BannedRule; hit: string }[] = [];
  for (const rule of rules) {
    if (rule.phrase && text.includes(rule.phrase)) hits.push({ rule, hit: rule.phrase });
    if (rule.pattern) {
      const re = new RegExp(rule.pattern);
      const match = text.match(re);
      if (match) hits.push({ rule, hit: match[0] });
    }
  }
  return hits;
}

const TEMPLATE_LEFTOVERS = [/introduction\s*:/i, /\blorem ipsum\b/i, /\[작성/, /\bTODO\b/, /\{\{/, /YOUR_TITLE/i];

export function templateLeftovers(text: string): string[] {
  return TEMPLATE_LEFTOVERS.filter((re) => re.test(text)).map((re) => re.source);
}

export interface PageRef {
  path: string;
}

export function knownPaths(posts: { id: string; data: PostFrontmatter }[]): Set<string> {
  const paths = new Set<string>([
    "/",
    "/roadmap",
    "/search",
    "/author",
    "/about",
    "/privacy",
    "/terms",
    "/contact",
    "/rss.xml",
  ]);
  for (const post of posts) paths.add(`/${post.id}`);
  const categories = new Set(posts.map((p) => p.data.category));
  for (const id of categories) paths.add(`/category/${id}`);
  const tags = new Set(posts.flatMap((p) => p.data.tags));
  for (const tag of tags) paths.add(`/tag/${encodeURIComponent(tag)}`);
  const series = new Set(posts.map((p) => p.data.series?.id).filter(Boolean) as string[]);
  for (const id of series) paths.add(`/series/${id}`);
  return paths;
}

export function internalLinks(text: string): string[] {
  const links = new Set<string>();
  const re = /(?:href=|\]\()(\/[^)\s"'#]+)/g;
  for (const match of text.matchAll(re)) {
    const raw = match[1].replace(/\/$/, "") || "/";
    links.add(raw.split("?")[0]);
  }
  return [...links];
}

export function brokenLinks(text: string, paths: Set<string>): string[] {
  return internalLinks(text).filter((link) => {
    if (link.startsWith("/og/")) return false;
    if (link.startsWith("/category/") || link.startsWith("/tag/") || link.startsWith("/series/")) {
      return !paths.has(link);
    }
    return !paths.has(link);
  });
}

export function answerBlocks(body: string): string[] {
  const blocks: string[] = [];
  const parts = body.split(/^##\s+.+$/m).slice(1);
  for (const part of parts) {
    const paragraph = part
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("-") && !p.startsWith("<"));
    if (paragraph) {
      const plain = paragraph.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (plain) blocks.push(plain);
    }
  }
  return blocks;
}

export function sentenceLengths(body: string): { sentence: string; chars: number }[] {
  const plain = body
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ");
  const paragraphs = plain.split(/\n\s*\n/);
  const out: { sentence: string; chars: number }[] = [];
  for (const paragraph of paragraphs) {
    const parts = paragraph
      .split(/(?<=[\.!?])\s+/)
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 0 && !s.startsWith("#") && !s.startsWith("|") && !s.startsWith("-"));
    for (const sentence of parts) {
      out.push({ sentence, chars: sentence.replace(/\s/g, "").length });
    }
  }
  return out;
}

export function paragraphSentenceCounts(body: string): number[] {
  const plain = body.replace(/<[^>]+>/g, " ");
  return plain
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#") && !p.startsWith("|") && !p.startsWith("-") && !p.startsWith("<"))
    .map((p) => p.split(/(?<=[\.!?])\s+/).filter((s) => s.trim().length > 8).length)
    .filter((n) => n > 0);
}

const HIGHLIGHT_RE = /<Mark\b[^>]*>[\s\S]*?<\/Mark>|==[^=\n]+==/g;
const BOLD_RE = /<strong\b[^>]*>[\s\S]*?<\/strong>|\*\*[^*\n]+\*\*/g;

export function emphasisWarnings(body: string): string[] {
  const warnings: string[] = [];
  const highlights = body.match(HIGHLIGHT_RE) ?? [];
  if (highlights.length > 3) {
    warnings.push(`형광펜은 글당 3개까지입니다. 지금 ${highlights.length}개입니다.`);
  }
  const bolds = body.match(BOLD_RE) ?? [];
  if (bolds.length > 4) {
    warnings.push(`볼드는 답 구절에만 씁니다. 글에 ${bolds.length}개입니다. 4개까지가 한도입니다.`);
  }
  for (const section of body.split(/^##\s+.+$/m)) {
    const sectionMarks = section.match(HIGHLIGHT_RE) ?? [];
    if (sectionMarks.length > 1) {
      warnings.push(`한 구간에 형광펜이 ${sectionMarks.length}개입니다. 구간당 1개가 한도입니다.`);
    }
    const sectionBolds = section.match(BOLD_RE) ?? [];
    if (sectionBolds.length > 1) {
      warnings.push(`한 구간에 볼드가 ${sectionBolds.length}개입니다. 답 구절 하나만 씁니다.`);
    }
  }
  return warnings;
}

export function keywordPlacementErrors(data: PostFrontmatter, body: string): string[] {
  const keyword = data.검색어.trim();
  const errors: string[] = [];
  const at = data.serpTitle.indexOf(keyword);
  const before = at < 0 ? 99 : [...data.serpTitle.slice(0, at)].length;
  if (at < 0 || before >= 15) {
    errors.push(`검색어 "${keyword}"가 SERP 제목 앞 15자 안에 없습니다.`);
  }
  if (!data.title.includes(keyword)) errors.push("H1에 대표 검색어가 없습니다.");
  if (!data.description.includes(keyword)) errors.push("메타 설명에 대표 검색어가 없습니다.");
  const descLen = [...data.description].length;
  if (descLen < 120 || descLen > 150) {
    errors.push(`메타 설명은 120~150자여야 합니다. 지금 ${descLen}자입니다.`);
  }
  const first = body
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\n\s*\n/)[0]
    ?.replace(/\s+/g, " ")
    .trim();
  if (!first?.includes(keyword)) errors.push("첫 문단에 대표 검색어가 없습니다.");
  return errors;
}

export function markdownMarkersInVisibleHtml(html: string): string[] {
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, " ");
  const hits: string[] = [];
  if (visible.includes("**")) hits.push("**");
  if (visible.includes("__")) hits.push("__");
  return hits;
}

export function emojiCount(text: string): number {
  const found = text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  return found?.length ?? 0;
}

interface GlossaryItem {
  id: string;
  term: string;
  plain: string;
}

export function glossaryMisses(text: string, items: GlossaryItem[] = glossary as GlossaryItem[]): string[] {
  const misses: string[] = [];
  const sorted = [...items].sort((a, b) => b.term.length - a.term.length);
  const masked = text.replace(/<(?:Term)\b[^>]*>[\s\S]*?<\/Term>/g, " ");
  for (const item of sorted) {
    if (!termAppears(masked, item.term) && !termAppears(text, item.term)) continue;
    const used = termAppears(text, item.term);
    const explained = new RegExp(`<Term\\b[^>]*\\bid=["']${item.id}["']`).test(text);
    if (used && !explained) misses.push(item.term);
  }
  return misses;
}

function termAppears(text: string, term: string): boolean {
  let from = 0;
  const particles = /^[은는이가을를와과의도만에도로]/;
  while (from < text.length) {
    const i = text.indexOf(term, from);
    if (i < 0) return false;
    const before = text[i - 1] ?? "";
    const after = text[i + term.length] ?? "";
    const beforeOk = !/[가-힣]/.test(before);
    const afterOk = !/[가-힣]/.test(after) || particles.test(after);
    if (beforeOk && afterOk) return true;
    from = i + term.length;
  }
  return false;
}

export function titleFrameErrors(posts: LoadedPost[]): string[] {
  const sorted = [...posts].sort((a, b) => publishDateOf(a.data).localeCompare(publishDateOf(b.data)));
  const errors: string[] = [];
  sorted.forEach((post, index) => {
    const prev = sorted.slice(Math.max(0, index - 2), index);
    const clash = prev.find((p) => p.data.제목틀 === post.data.제목틀);
    if (clash) {
      errors.push(`${post.id}: 제목틀 ${post.data.제목틀}이 직전 글(${clash.id})과 같습니다.`);
    }
  });
  return errors;
}

export function compositionStreakErrors(posts: LoadedPost[]): string[] {
  const sorted = [...posts].sort((a, b) => publishDateOf(a.data).localeCompare(publishDateOf(b.data)));
  const errors: string[] = [];
  for (let i = 2; i < sorted.length; i++) {
    const a = sorted[i - 2].data.구성;
    const b = sorted[i - 1].data.구성;
    const c = sorted[i].data.구성;
    if (a === b && b === c) {
      errors.push(`${sorted[i].id}: 구성 ${c}이 세 번 연속입니다.`);
    }
  }
  return errors;
}

export function loadFacts(file: string): Fact[] {
  const doc = parseYaml(readFileSync(file, "utf8")) as { facts?: Fact[] };
  return doc.facts ?? [];
}

export function validateFacts(facts: Fact[], cited: string[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  facts.forEach((fact, index) => {
    if (!/^F\d+$/.test(fact.id)) errors.push(`사실 ${index} id가 F번호가 아닙니다.`);
    if (ids.has(fact.id)) errors.push(`사실 id 중복 ${fact.id}`);
    ids.add(fact.id);
    if (!fact.value?.trim()) errors.push(`${fact.id} 값이 비었습니다.`);
    if (!fact.source?.startsWith("http")) errors.push(`${fact.id} 출처 URL이 없습니다.`);
    if (!fact.checkedAt) errors.push(`${fact.id} checkedAt이 없습니다.`);
  });
  for (const id of cited) {
    if (!ids.has(id)) errors.push(`근거 ${id}가 원장에 없습니다.`);
  }
  return errors;
}

export function loadPosts(root = process.cwd()): LoadedPost[] {
  const dir = path.join(root, "src/content/posts");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".mdx") || name.endsWith(".md"))
    .map((name) => {
      const file = path.join(dir, name);
      const raw = readFileSync(file, "utf8");
      const parsed = matter(raw);
      const id = name.replace(/\.mdx?$/, "");
      const result = postSchema.safeParse(parsed.data);
      if (!result.success) {
        const message = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`${name} 프론트매터 오류: ${message}`);
      }
      return { id, file, data: result.data, body: parsed.content, raw };
    });
}

export function massTitleEdits(posts: LoadedPost[], ledgerTitles: Map<string, string>): string[] {
  const changed = posts.filter((post) => {
    const published = ledgerTitles.get(post.id);
    return published && published !== post.data.title;
  });
  if (changed.length >= 2) {
    return [`발행된 글 제목이 ${changed.length}개 바뀌었습니다. 제목을 한꺼번에 고치지 않습니다.`];
  }
  return [];
}

export function checkPosts(posts: LoadedPost[], root = process.cwd()): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const rules = loadBanned(root);
  const paths = knownPaths(posts);
  const seriesOrder = new Map<string, Set<number>>();

  for (const post of posts) {
    const factsPath = path.join(root, "work", post.id, "facts.yaml");
    if (!existsSync(factsPath)) {
      issues.push({ level: "error", file: post.id, message: "work 원장 facts.yaml이 없습니다." });
      continue;
    }
    const facts = loadFacts(factsPath);
    for (const message of validateFacts(facts, post.data.근거)) {
      issues.push({ level: "error", file: post.id, message });
    }
    const claims = claimText(post.data, post.body);
    const missing = missingNumbers(claims, facts);
    if (missing.length) {
      issues.push({ level: "error", file: post.id, message: `원장에 없는 숫자: ${missing.join(", ")}` });
    }
    if (!post.data.sources.length) {
      issues.push({ level: "error", file: post.id, message: "출처가 없습니다." });
    }
    for (const hit of findBanned(`${post.data.title}\n${post.data.description}\n${post.body}`, rules)) {
      issues.push({ level: "error", file: post.id, message: `금지 표현 "${hit.hit}": ${hit.rule.reason}` });
    }
    for (const leftover of templateLeftovers(post.raw)) {
      issues.push({ level: "error", file: post.id, message: `템플릿 잔여: ${leftover}` });
    }
    for (const link of brokenLinks(`${post.body}\n${JSON.stringify(post.data)}`, paths)) {
      issues.push({ level: "error", file: post.id, message: `끊긴 내부 링크 ${link}` });
    }
    for (const term of glossaryMisses(`${post.data.title}\n${post.body}`)) {
      issues.push({ level: "error", file: post.id, message: `용어 설명 없음: ${term}. <Term>으로 처음 풀어 주세요.` });
    }
    for (const message of keywordPlacementErrors(post.data, post.body)) {
      issues.push({ level: "error", file: post.id, message });
    }
    if (post.raw.includes("백세영")) {
      issues.push({ level: "error", file: post.id, message: "실명을 쓰지 않습니다. 필명은 백현입니다." });
    }
    if (emojiCount(post.body) > 0) {
      issues.push({ level: "error", file: post.id, message: "이모지를 넣지 않습니다." });
    }
    const adCount = (post.body.match(/<AdSlot\b/g) ?? []).length;
    if (adCount > 3) {
      issues.push({ level: "error", file: post.id, message: `본문 광고는 3개까지입니다. 지금 ${adCount}개입니다.` });
    }
    for (const block of answerBlocks(post.body)) {
      if (block.length < 130 || block.length > 170) {
        issues.push({
          level: "info",
          file: post.id,
          message: `답 블록 ${block.length}자 (목표 130~170): ${block.slice(0, 36)}`,
        });
      }
    }
    for (const item of sentenceLengths(post.body)) {
      if (item.chars > 60) {
        issues.push({
          level: "info",
          file: post.id,
          message: `60자 넘는 문장(${item.chars}자): ${item.sentence.slice(0, 42)}`,
        });
      }
    }
    for (const count of paragraphSentenceCounts(post.body)) {
      if (count >= 4) {
        issues.push({ level: "info", file: post.id, message: `한 문단에 문장이 ${count}개입니다. 2~3개가 목표입니다.` });
      }
    }
    for (const message of emphasisWarnings(post.body)) {
      issues.push({ level: "info", file: post.id, message });
    }
    if (post.data.series) {
      const key = post.data.series.id;
      const set = seriesOrder.get(key) ?? new Set<number>();
      if (set.has(post.data.series.order)) {
        issues.push({ level: "error", file: post.id, message: `시리즈 ${key} 순번 중복` });
      }
      set.add(post.data.series.order);
      seriesOrder.set(key, set);
    }
  }

  for (const message of titleFrameErrors(posts)) issues.push({ level: "error", file: "제목틀", message });
  for (const message of compositionStreakErrors(posts)) issues.push({ level: "error", file: "구성", message });

  const ledgerPath = path.join(root, "work/ledger.json");
  if (existsSync(ledgerPath)) {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      posts?: Record<string, { publishedTitle?: string }>;
    };
    const titles = new Map<string, string>();
    for (const [id, row] of Object.entries(ledger.posts ?? {})) {
      if (row.publishedTitle) titles.set(id, row.publishedTitle);
    }
    for (const message of massTitleEdits(posts, titles)) {
      issues.push({ level: "error", file: "제목", message });
    }
  }
  return issues;
}

export function isPublished(data: PostFrontmatter, today: string): boolean {
  return publishDateOf(data) <= today;
}
