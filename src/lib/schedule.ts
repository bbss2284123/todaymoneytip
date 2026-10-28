import { recommendThrottle, type ThrottleInput } from "./indexing";

export interface ScheduleConfig {
  seed: string;
  launchDate: string;
  launchCount: { min: number; max: number };
  stages: { fromWeek: number; toWeek: number | null; min: number; max: number }[];
  skipEveryDays: { min: number; max: number };
  window: { startHour: number; endHour: number };
  minGapMinutes: number;
  indexedRate: number;
  consecutiveMisses: number;
  recoveryStreakDays: number;
}

export interface ScheduleItem {
  id: string;
  category: string;
  composition: string;
  frame: string;
}

export interface PlannedPost {
  id: string;
  time: string;
  category: string;
  composition: string;
  frame: string;
}

export interface PlannedDay {
  date: string;
  week: number;
  skip: boolean;
  posts: PlannedPost[];
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekOf(launch: string, date: string): number {
  const a = Date.parse(`${launch}T00:00:00+09:00`);
  const b = Date.parse(`${date}T00:00:00+09:00`);
  return Math.floor((b - a) / 86_400_000 / 7) + 1;
}

function bandFor(config: ScheduleConfig, week: number, throttleCap: number): { min: number; max: number } {
  const stage =
    config.stages.find((row) => week >= row.fromWeek && (row.toWeek == null || week <= row.toWeek)) ??
    config.stages[config.stages.length - 1];
  const max = Math.max(0, Math.min(stage.max, throttleCap));
  const min = Math.min(stage.min, max);
  return { min, max };
}

function ints(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function skipSet(config: ScheduleConfig, rng: () => number, days: number): Set<string> {
  const skips = new Set<string>();
  let cursor = ints(rng, config.skipEveryDays.min, config.skipEveryDays.max);
  while (cursor < days) {
    skips.add(addDays(config.launchDate, cursor));
    cursor += ints(rng, config.skipEveryDays.min, config.skipEveryDays.max);
  }
  return skips;
}

function timesFor(count: number, config: ScheduleConfig, rng: () => number, previous: string[]): string[] {
  if (count <= 0) return [];
  const start = config.window.startHour * 60;
  const end = config.window.endHour * 60;
  const gap = config.minGapMinutes;
  let n = count;
  while (n > 1 && end - start < gap * (n - 1)) n -= 1;
  const extra = end - start - gap * (n - 1);
  const weights = Array.from({ length: n + 1 }, () => rng() + 0.01);
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => (w / sum) * extra);
  const minutes: number[] = [];
  let cursor = start + parts[0];
  for (let i = 0; i < n; i++) {
    minutes.push(Math.round(cursor));
    cursor += gap + (parts[i + 1] ?? 0);
  }
  return minutes.map((minute) => {
    let value = Math.min(end, Math.max(start, minute));
    let label = toHm(value);
    let guard = 0;
    while (previous.includes(label) && guard < 20) {
      value = Math.min(end, value + 11);
      label = toHm(value);
      guard += 1;
    }
    return label;
  });
}

function toHm(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function takeNext(pool: ScheduleItem[], previous?: ScheduleItem): ScheduleItem {
  const ranked = [...pool].sort((a, b) => scorePick(b, previous) - scorePick(a, previous));
  return ranked[0];
}

function scorePick(item: ScheduleItem, previous?: ScheduleItem): number {
  if (!previous) return 1;
  let score = 0;
  if (item.category !== previous.category) score += 4;
  if (item.composition !== previous.composition) score += 2;
  if (item.frame !== previous.frame) score += 2;
  return score;
}

export function buildPlan(config: ScheduleConfig, items: ScheduleItem[], horizonDays: number): PlannedDay[] {
  const rng = mulberry32(hashSeed(config.seed));
  const throttle = recommendThrottle({
    indexedRate: config.indexedRate,
    consecutiveMisses: config.consecutiveMisses,
    recoveryStreakDays: config.recoveryStreakDays,
  } satisfies ThrottleInput);
  const skips = skipSet(config, rng, horizonDays);
  const pool = [...items];
  const days: PlannedDay[] = [];
  let previous: ScheduleItem | undefined;
  let previousTimes: string[] = [];

  for (let offset = 0; offset < horizonDays && pool.length; offset++) {
    const date = addDays(config.launchDate, offset);
    const week = weekOf(config.launchDate, date);
    const skip = offset > 0 && skips.has(date);
    const band = bandFor(config, week, throttle.postsPerDay);
    let count = 0;
    if (!skip && pool.length) {
      if (offset === 0) {
        const healthy = config.indexedRate >= 0.8 && throttle.postsPerDay >= 3 && throttle.allowPublishedEdits;
        const cap = healthy ? config.launchCount.max : throttle.postsPerDay;
        const floor = healthy ? config.launchCount.min : 1;
        count = Math.min(pool.length, ints(rng, Math.min(floor, cap), cap));
      } else if (band.max > 0) {
        count = Math.min(pool.length, ints(rng, band.min, band.max));
      }
    }
    const labels = timesFor(count, config, rng, previousTimes);
    const posts: PlannedPost[] = [];
    for (let i = 0; i < labels.length && pool.length; i++) {
      const pick = takeNext(pool, previous);
      pool.splice(pool.indexOf(pick), 1);
      previous = pick;
      posts.push({
        id: pick.id,
        time: labels[i],
        category: pick.category,
        composition: pick.composition,
        frame: pick.frame,
      });
    }
    previousTimes = posts.map((post) => post.time);
    days.push({ date, week, skip: posts.length === 0, posts });
  }
  return days;
}

export function gapHours(times: string[]): number[] {
  const minutes = times.map((time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  });
  const gaps: number[] = [];
  for (let i = 1; i < minutes.length; i++) gaps.push((minutes[i] - minutes[i - 1]) / 60);
  return gaps;
}
