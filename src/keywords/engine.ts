import { createHmac, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import seedsFile from "../../data/keyword-seeds.json";
import { siteConfig } from "../../site.config";

export interface KeywordEnv {
  NAVER_AD_API_KEY?: string;
  NAVER_AD_SECRET?: string;
  NAVER_AD_CUSTOMER_ID?: string;
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  GSC_ACCESS_TOKEN?: string;
  GSC_SITE_URL?: string;
}

export interface VolumeRow {
  keyword: string;
  pc: number;
  mobile: number;
  compIdx: "높음" | "중간" | "낮음" | "";
}

export interface AdapterResult<T> {
  ok: boolean;
  reason?: "missing_key" | "http" | "unavailable" | "cached";
  data: T;
}

export interface PostCover {
  slug: string;
  title: string;
  serpTitle: string;
  keyword: string;
  tags: string[];
}

export interface QueueItem {
  id: string;
  category: string;
  primary: string;
  secondaries: string[];
  h2s: string[];
  score: number;
  titleFrame: "결과형" | "숫자형" | "질문형" | "대비형" | "상황형" | "인용형";
  composition: "해설" | "계산" | "추적" | "대비" | "서사";
  timing: { note: string; weeksBeforePeak: number | null; peakLabel: string };
  coveredBy: string | null;
  sources: string[];
  gap: GapReport;
}

export interface GapReport {
  sources: { kind: string; title: string; url: string; ourNote: string }[];
  plan: string[];
  copiedText: false;
}

export interface QueueFile {
  generatedAt: string;
  mode: string;
  warnings: string[];
  items: QueueItem[];
}

const RETIREMENT = siteConfig.keywords.retirementTerms;
const WEIGHTS = siteConfig.keywords.weights;

const BLOCK = [
  /공모주/,
  /코인/,
  /비트코인/,
  /급등/,
  /떡상/,
  /연예/,
  /아이돌/,
  /주식추천/,
  /리딩방/,
  /로또/,
];

const OFFICIAL: Record<string, { title: string; url: string; ourNote: string }[]> = {
  pension: [
    {
      kind: "official",
      title: "국민연금공단 노령연금",
      url: "https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0056M0.do",
      ourNote: "나이표와 감액 규칙이 조문 순서다. 우리는 한 달 차이부터 보여 준다.",
    },
  ],
  severance: [
    {
      kind: "official",
      title: "국세청 퇴직소득",
      url: "https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7880&mi=6444",
      ourNote: "계산 구조가 길다. 우리는 예시 한 줄과 계산기로 나눈다.",
    },
  ],
  health: [
    {
      kind: "official",
      title: "국민건강보험법 시행규칙 별표 1의2",
      url: "https://www.law.go.kr/LSW/flDownload.do?flSeq=162807125",
      ourNote: "요건이 표로만 있다. 우리는 내 경우 체크로 다시 적는다.",
    },
  ],
  housing: [
    {
      kind: "official",
      title: "주택금융공사 월지급금 예시",
      url: "https://hf.go.kr/ko/sub03/sub03_01_01_02.do",
      ourNote: "표는 길다. 우리는 나이와 집값 두 칸만 고르게 한다.",
    },
  ],
  basic: [
    {
      kind: "official",
      title: "보건복지부 기초연금",
      url: "https://www.mohw.go.kr/board.es?act=view&bid=0027&list_no=1488478&mid=a10503010100",
      ourNote: "보도자료 문장을 베끼지 않고, 기준 금액만 확인한 뒤 쉬운 문장으로 쓴다.",
    },
  ],
};

export function hasAdKey(env: KeywordEnv): boolean {
  return Boolean(env.NAVER_AD_API_KEY && env.NAVER_AD_SECRET && env.NAVER_AD_CUSTOMER_ID);
}

export function hasDatalabKey(env: KeywordEnv): boolean {
  return Boolean(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET);
}

export function signNaverAd(secret: string, timestamp: string, method: string, uri: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${method}.${uri}`).digest("base64");
}

export function parseQc(value: unknown): number {
  if (typeof value === "number") return value;
  const text = String(value ?? "");
  if (text.includes("<")) return 5;
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseNaverSuggest(payload: unknown): string[] {
  const data = payload as { items?: unknown[][] };
  const items = data?.items ?? [];
  const out: string[] = [];
  for (const row of items) {
    if (Array.isArray(row) && typeof row[0] === "string") out.push(row[0]);
    else if (typeof row === "string") out.push(row);
  }
  return out;
}

export function parseGoogleSuggest(payload: unknown): string[] {
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) return [];
  return payload[1].filter((item) => typeof item === "string");
}

export async function naverAds(
  keywords: string[],
  env: KeywordEnv,
  fetchImpl: typeof fetch,
): Promise<AdapterResult<VolumeRow[]>> {
  if (!hasAdKey(env)) return { ok: false, reason: "missing_key", data: [] };
  const uri = "/keywordstool";
  const timestamp = Date.now().toString();
  const hint = keywords.slice(0, 5).join(",");
  const url = `https://api.searchad.naver.com${uri}?hintKeywords=${encodeURIComponent(hint)}&showDetail=1`;
  const response = await fetchImpl(url, {
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": env.NAVER_AD_API_KEY ?? "",
      "X-Customer": env.NAVER_AD_CUSTOMER_ID ?? "",
      "X-Signature": signNaverAd(env.NAVER_AD_SECRET ?? "", timestamp, "GET", uri),
    },
  });
  if (!response.ok) return { ok: false, reason: "http", data: [] };
  const json = (await response.json()) as {
    keywordList?: { relKeyword: string; monthlyPcQcCnt: unknown; monthlyMobileQcCnt: unknown; compIdx?: string }[];
  };
  const data = (json.keywordList ?? []).map((row) => ({
    keyword: row.relKeyword,
    pc: parseQc(row.monthlyPcQcCnt),
    mobile: parseQc(row.monthlyMobileQcCnt),
    compIdx: (row.compIdx as VolumeRow["compIdx"]) || "",
  }));
  return { ok: true, data };
}

export async function naverSuggest(query: string, fetchImpl: typeof fetch): Promise<AdapterResult<string[]>> {
  const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(query)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
  try {
    const response = await fetchImpl(url);
    if (!response.ok) return { ok: false, reason: "http", data: [] };
    return { ok: true, data: parseNaverSuggest(await response.json()) };
  } catch {
    return { ok: false, reason: "unavailable", data: [] };
  }
}

export async function googleSuggest(query: string, fetchImpl: typeof fetch): Promise<AdapterResult<string[]>> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetchImpl(url);
    if (!response.ok) return { ok: false, reason: "http", data: [] };
    return { ok: true, data: parseGoogleSuggest(await response.json()) };
  } catch {
    return { ok: false, reason: "unavailable", data: [] };
  }
}

export async function naverDatalab(
  keywords: string[],
  env: KeywordEnv,
  fetchImpl: typeof fetch,
): Promise<AdapterResult<{ keyword: string; momentum: number }[]>> {
  if (!hasDatalabKey(env)) return { ok: false, reason: "missing_key", data: [] };
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 370);
  const body = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    timeUnit: "month",
    keywordGroups: keywords.slice(0, 5).map((keyword) => ({ groupName: keyword, keywords: [keyword] })),
  };
  try {
    const response = await fetchImpl("https://openapi.naver.com/v1/datalab/search", {
      method: "POST",
      headers: {
        "X-Naver-Client-Id": env.NAVER_CLIENT_ID ?? "",
        "X-Naver-Client-Secret": env.NAVER_CLIENT_SECRET ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return { ok: false, reason: "http", data: [] };
    const json = (await response.json()) as {
      results?: { title: string; data: { period: string; ratio: number }[] }[];
    };
    const data = (json.results ?? []).map((row) => {
      const ratios = row.data.map((d) => d.ratio);
      const last = ratios.at(-1) ?? 0;
      const prev = ratios.at(-2) ?? last;
      return { keyword: row.title, momentum: last - prev };
    });
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "unavailable", data: [] };
  }
}

export async function googleTrends(fetchImpl: typeof fetch): Promise<AdapterResult<string[]>> {
  try {
    const response = await fetchImpl("https://trends.google.com/trending/rss?geo=KR");
    if (!response.ok) return { ok: false, reason: "unavailable", data: [] };
    const xml = await response.text();
    const titles = [...xml.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]).slice(1, 15);
    return { ok: true, data: titles };
  } catch {
    return { ok: false, reason: "unavailable", data: [] };
  }
}

export async function searchConsole(
  env: KeywordEnv,
  fetchImpl: typeof fetch,
): Promise<AdapterResult<{ query: string; position: number; ctr: number; impressions: number }[]>> {
  if (!env.GSC_ACCESS_TOKEN || !env.GSC_SITE_URL) return { ok: false, reason: "missing_key", data: [] };
  const site = encodeURIComponent(env.GSC_SITE_URL);
  try {
    const response = await fetchImpl(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GSC_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: "2026-07-01",
          endDate: "2026-10-28",
          dimensions: ["query"],
          rowLimit: 50,
        }),
      },
    );
    if (!response.ok) return { ok: false, reason: "http", data: [] };
    const json = (await response.json()) as {
      rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
    };
    const data = (json.rows ?? [])
      .filter((row) => (row.position >= 5 && row.position <= 20) || (row.impressions >= 50 && row.ctr < 0.03))
      .map((row) => ({
        query: row.keys[0],
        position: row.position,
        ctr: row.ctr,
        impressions: row.impressions,
      }));
    return { ok: true, data };
  } catch {
    return { ok: false, reason: "unavailable", data: [] };
  }
}

export function expandSeeds(category?: string): { category: string; keyword: string }[] {
  const tails = seedsFile.questionTails;
  const entries = Object.entries(seedsFile.categories).filter(([id]) => !category || id === category);
  const rows: { category: string; keyword: string }[] = [];
  for (const [id, list] of entries) {
    for (const seed of list) {
      rows.push({ category: id, keyword: seed });
      for (const tail of tails) rows.push({ category: id, keyword: `${seed} ${tail}` });
    }
  }
  const lifeCategories = category ? entries.map(([id]) => id) : ["prepare", "pension", "health", "basic"];
  for (const event of seedsFile.lifeEvents) {
    for (const id of lifeCategories) rows.push({ category: id, keyword: event });
  }
  return rows;
}

export function blocked(keyword: string): boolean {
  return BLOCK.some((re) => re.test(keyword));
}

export function competitionScore(compIdx: string): number {
  if (compIdx === "낮음") return 1;
  if (compIdx === "중간") return 0.55;
  if (compIdx === "높음") return 0.2;
  return 0.45;
}

export function serpDifficulty(keyword: string): number {
  if (/계산|비교|조건|신청/.test(keyword)) return 0.7;
  if (/추천|최고|대박/.test(keyword)) return 0.2;
  return 0.5;
}

export function fitScore(keyword: string, category: string): number {
  const cat = siteConfig.categories.find((c) => c.id === category);
  let score = 0.35;
  if (cat && (keyword.includes(cat.name.slice(0, 2)) || cat.description.split(" ").some((w) => w.length > 1 && keyword.includes(w)))) {
    score += 0.2;
  }
  if (RETIREMENT.some((term) => keyword.includes(term))) score += 0.45;
  if (seedsFile.lifeEvents.some((event) => keyword.includes(event))) score += 0.15;
  return Math.min(1, score);
}

export function seasonality(keyword: string): { score: number; weeksBeforePeak: number | null; peakLabel: string } {
  if (/연말정산|연금저축|세액공제|퇴직소득/.test(keyword)) {
    return { score: 0.9, weeksBeforePeak: 3, peakLabel: "연말정산 시즌" };
  }
  if (/기초연금|만 65세/.test(keyword)) return { score: 0.8, weeksBeforePeak: 3, peakLabel: "만 65세" };
  if (/만 60세|조기수령|임의계속/.test(keyword)) return { score: 0.75, weeksBeforePeak: 3, peakLabel: "만 60세 전후" };
  if (/퇴직 한 달 전/.test(keyword)) return { score: 0.85, weeksBeforePeak: 0, peakLabel: "퇴직 한 달 전" };
  if (/퇴직 다음 날|피부양자|실업급여/.test(keyword)) return { score: 0.8, weeksBeforePeak: 2, peakLabel: "퇴직일" };
  if (/주택연금|국민연금|상속|증여/.test(keyword)) return { score: 0.55, weeksBeforePeak: 3, peakLabel: "상시, 생일·신고 전" };
  return { score: 0.4, weeksBeforePeak: null, peakLabel: "상시" };
}

export function adsenseValue(keyword: string): number {
  if (/계산|비교|세금|보험료|연금|대출|주택/.test(keyword)) return 0.8;
  if (/신청|조건|대상/.test(keyword)) return 0.55;
  return 0.3;
}

export function evergreenScore(keyword: string): number {
  if (/오늘|속보|급등|대선|연예/.test(keyword)) return 0.1;
  return 0.8;
}

export function scoreKeyword(input: {
  keyword: string;
  category: string;
  volume?: number;
  compIdx?: string;
  momentum?: number;
}): number {
  const volume = Math.min(1, Math.log10((input.volume ?? 80) + 10) / 5);
  const comp = (competitionScore(input.compIdx ?? "") + serpDifficulty(input.keyword)) / 2;
  const trend = Math.max(0, Math.min(1, 0.5 + (input.momentum ?? 0) / 100));
  const season = seasonality(input.keyword);
  const w = WEIGHTS;
  return Number(
    (
      w.volume * volume +
      w.competition * comp +
      w.trend * trend +
      w.seasonality * season.score +
      w.adsense * adsenseValue(input.keyword) +
      w.fit * fitScore(input.keyword, input.category) +
      w.evergreen * evergreenScore(input.keyword)
    ).toFixed(4),
  );
}

export function normalizeIntent(keyword: string): string {
  return keyword
    .replace(/\s+/g, "")
    .replace(/(언제|얼마|조건|신청방법|신청|대상|계산|방법|하는법)$/g, "")
    .replace(/(은|는|이|가|을|를|의)$/g, "");
}

export function clusterKeywords(
  rows: { category: string; keyword: string; score: number; volume: number }[],
): Map<string, { category: string; keyword: string; score: number; volume: number }[]> {
  const groups = new Map<string, { category: string; keyword: string; score: number; volume: number }[]>();
  for (const row of rows) {
    const key = `${row.category}:${normalizeIntent(row.keyword)}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

export function suggestFrame(keyword: string): QueueItem["titleFrame"] {
  if (/얼마|수령액|세금|보험료/.test(keyword)) return "숫자형";
  if (/vs|비교|일시금|조기|연기/.test(keyword)) return "대비형";
  if (/언제|조건|대상|신청/.test(keyword)) return "질문형";
  if (/한 달 전|다음 날|만 6/.test(keyword)) return "상황형";
  return "결과형";
}

export function suggestComposition(keyword: string): QueueItem["composition"] {
  if (/계산|세금|보험료|수령액/.test(keyword)) return "계산";
  if (/비교|조기|연기|일시금/.test(keyword)) return "대비";
  if (/체크|준비|한 달/.test(keyword)) return "해설";
  return "해설";
}

/** 자동완성 하위 검색어를 질문형 소제목 후보로 바꿉니다. */
export function toQuestionH2(keyword: string): string {
  const text = keyword.trim().replace(/\s+/g, " ").replace(/[?？]\s*$/, "");
  if (!text) return "";
  if (/(요|까)$/.test(keyword.trim()) && /(어떻게|무엇|얼마|몇|언제)/.test(text)) return keyword.trim();
  if (/계산기$/.test(text)) return `${text}는 어떻게 하나요`;
  if (/(계산방법|계산|신청방법|확인하는 법|피하는 법|방법)$/.test(text)) return `${text}은 어떻게 하나요`;
  if (/나이$/.test(text)) return `${text}는 몇 살인가요`;
  if (/(감액|세율|한도|수령액|액)$/.test(text)) return `${text}은 얼마인가요`;
  return `${text}은 무엇인가요`;
}

export function questionH2s(keywords: string[], autocomplete: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...autocomplete, ...keywords]) {
    const h2 = toQuestionH2(raw);
    if (!h2 || seen.has(h2)) continue;
    seen.add(h2);
    out.push(h2);
  }
  return out;
}

export function coverMatch(keyword: string, posts: PostCover[]): string | null {
  const intent = normalizeIntent(keyword);
  for (const post of posts) {
    const blob = normalizeIntent(`${post.keyword} ${post.title} ${post.serpTitle} ${post.tags.join(" ")}`);
    if (blob.includes(intent) || intent.includes(normalizeIntent(post.keyword))) return post.slug;
  }
  return null;
}

export function gapFor(category: string, keyword: string, related: string[]): GapReport {
  const sources = [...(OFFICIAL[category] ?? [])];
  for (const title of related.slice(0, 3)) {
    sources.push({
      kind: "suggest",
      title,
      url: "",
      ourNote: "사람들이 이어서 치는 말이다. 문장을 가져오지 않고 질문 소제목 후보로만 쓴다.",
    });
  }
  if (!sources.length) {
    sources.push({
      kind: "catalog",
      title: "공식 안내",
      url: siteConfig.url,
      ourNote: "공식 페이지를 다시 읽고, 표와 체크와 순서로 다시 묶는다.",
    });
  }
  return {
    sources,
    plan: ["한 페이지 요약표", "내 경우 체크리스트", "신청 또는 계산 순서", `중심 검색어: ${keyword}`],
    copiedText: false,
  };
}

export function cachePath(dir: string, key: string): string {
  return path.join(dir, `${createHash("sha256").update(key).digest("hex").slice(0, 24)}.json`);
}

export function readCache<T>(dir: string, key: string, ttlMs: number): T | null {
  const file = cachePath(dir, key);
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { at: number; data: T };
  if (Date.now() - parsed.at > ttlMs) return null;
  return parsed.data;
}

export function writeCache<T>(dir: string, key: string, data: T): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(cachePath(dir, key), JSON.stringify({ at: Date.now(), data }));
}

export async function buildQueue(options: {
  category?: string;
  env?: KeywordEnv;
  fetchImpl?: typeof fetch;
  posts?: PostCover[];
  cacheDir?: string;
  useNetwork?: boolean;
  now?: Date;
}): Promise<QueueFile> {
  const env = options.env ?? {};
  const fetchImpl = options.fetchImpl ?? fetch;
  const warnings: string[] = [];
  const sourcesUsed = new Set<string>(["seeds"]);
  if (!hasAdKey(env)) warnings.push("네이버 검색광고 키가 없어 검색량은 기본값입니다.");
  if (!hasDatalabKey(env)) warnings.push("네이버 데이터랩 키가 없어 계절 지수는 규칙으로 계산합니다.");
  if (!env.GSC_ACCESS_TOKEN) warnings.push("서치콘솔 토큰이 없어 노출 쿼리는 비웠습니다.");

  let expanded = expandSeeds(options.category);
  const relatedBySeed = new Map<string, string[]>();

  if (options.useNetwork) {
    const sample = expanded.filter((row) => !row.keyword.includes(" ")).slice(0, 6);
    for (const row of sample) {
      const naver = await naverSuggest(row.keyword, fetchImpl);
      const google = await googleSuggest(row.keyword, fetchImpl);
      if (naver.ok) sourcesUsed.add("naver-suggest");
      if (google.ok) sourcesUsed.add("google-suggest");
      const extras = [...naver.data, ...google.data].filter((item) => !blocked(item));
      relatedBySeed.set(row.keyword, extras);
      for (const extra of extras.slice(0, 4)) {
        expanded.push({ category: row.category, keyword: extra });
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const trends = await googleTrends(fetchImpl);
    if (!trends.ok) warnings.push("구글 트렌드는 이번 실행에서 쓰지 않았습니다.");
    else sourcesUsed.add("google-trends");
    const gsc = await searchConsole(env, fetchImpl);
    if (gsc.ok) {
      sourcesUsed.add("search-console");
      for (const row of gsc.data) {
        expanded.push({ category: options.category || "prepare", keyword: row.query });
      }
    }
  }

  const seen = new Set<string>();
  const scored: { category: string; keyword: string; score: number; volume: number }[] = [];
  for (const row of expanded) {
    const key = `${row.category}:${row.keyword}`;
    if (seen.has(key) || blocked(row.keyword)) continue;
    seen.add(key);
    const fit = fitScore(row.keyword, row.category);
    if (fit < 0.4 && !RETIREMENT.some((term) => row.keyword.includes(term))) continue;
    scored.push({
      ...row,
      volume: 80,
      score: scoreKeyword({ keyword: row.keyword, category: row.category, volume: 80 }),
    });
  }

  const items: QueueItem[] = [];
  for (const [key, group] of clusterKeywords(scored)) {
    const tailPenalty = (keyword: string) => (/ (조건|계산)$/.test(keyword) ? 1 : 0);
    const sorted = [...group].sort((a, b) => tailPenalty(a.keyword) - tailPenalty(b.keyword) || b.score - a.score);
    const primary = sorted[0];
    const coveredBy = coverMatch(primary.keyword, options.posts ?? []);
    const season = seasonality(primary.keyword);
    const related = relatedBySeed.get(primary.keyword) ?? [];
    items.push({
      id: `kw-${createHash("sha256").update(key).digest("hex").slice(0, 8)}`,
      category: primary.category,
      primary: primary.keyword,
      secondaries: sorted.slice(1, 6).map((row) => row.keyword),
      h2s: questionH2s(
        [primary.keyword, ...sorted.slice(1).map((row) => row.keyword)],
        related,
      ),
      score: primary.score,
      titleFrame: suggestFrame(primary.keyword),
      composition: suggestComposition(primary.keyword),
      timing: {
        note:
          season.weeksBeforePeak == null
            ? "상시 글입니다."
            : `${season.peakLabel} ${season.weeksBeforePeak}주 전후에 발행합니다.`,
        weeksBeforePeak: season.weeksBeforePeak,
        peakLabel: season.peakLabel,
      },
      coveredBy,
      sources: [...sourcesUsed],
      gap: gapFor(primary.category, primary.keyword, related),
    });
  }

  items.sort((a, b) => b.score - a.score);
  const visible = items.filter((item) => !item.coveredBy).slice(0, options.category ? 20 : 40);
  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    mode: hasAdKey(env) || hasDatalabKey(env) ? "keyed" : "autocomplete-or-seeds",
    warnings,
    items: visible,
  };
}
