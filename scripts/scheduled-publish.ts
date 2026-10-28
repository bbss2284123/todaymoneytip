import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { dueBetween, type PublishStamp } from "../src/lib/publish-due";
import { siteConfig } from "../site.config";

const hook = process.env.CF_PAGES_DEPLOY_HOOK?.trim();
if (!hook) {
  console.log("CF_PAGES_DEPLOY_HOOK이 없어 배포를 건너뜁니다.");
  process.exit(0);
}

function readStamps(): PublishStamp[] {
  const dir = path.join(process.cwd(), "src/content/posts");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".mdx") || name.endsWith(".md"))
    .map((name) => {
      const raw = readFileSync(path.join(dir, name), "utf8");
      const id = name.replace(/\.mdx?$/, "");
      const publishAt = raw.match(/^publishAt:\s*"([^"]+)"/m)?.[1];
      const date = raw.match(/^date:\s*"([^"]+)"/m)?.[1];
      return { id, at: publishAt || date || "" };
    })
    .filter((post) => post.at);
}

async function lastSuccess(now: Date): Promise<Date> {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const runId = process.env.GITHUB_RUN_ID;
  const fallback = new Date(now.getTime() - 35 * 60 * 1000);
  if (!repo || !token) return fallback;
  const url = `https://api.github.com/repos/${repo}/actions/workflows/scheduled-publish.yml/runs?status=success&per_page=5`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return fallback;
    const json = (await response.json()) as { workflow_runs?: { id: number; updated_at?: string; created_at?: string }[] };
    const previous = (json.workflow_runs ?? []).find((run) => String(run.id) !== runId);
    const stamp = previous?.updated_at || previous?.created_at;
    return stamp ? new Date(stamp) : fallback;
  } catch {
    return fallback;
  }
}

async function pingIndexNow(urls: string[]): Promise<void> {
  if (!urls.length || !siteConfig.indexNowKey) return;
  const host = new URL(siteConfig.url).host;
  const body = JSON.stringify({
    host,
    key: siteConfig.indexNowKey,
    keyLocation: `${siteConfig.url}/${siteConfig.indexNowKey}.txt`,
    urlList: urls,
  });
  for (const endpoint of ["https://api.indexnow.org/indexnow", "https://searchadvisor.naver.com/indexnow"]) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
      });
      console.log(`${endpoint} ${response.status}`);
    } catch (error) {
      console.log(`${endpoint} 실패 ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
}

const now = new Date();
const since = await lastSuccess(now);
const due = dueBetween(readStamps(), now, since);
if (!due.length) {
  console.log("새로 공개할 글이 없어 배포를 건너뜁니다.");
  process.exit(0);
}

console.log(`공개 시각이 지난 글 ${due.length}편. 배포 훅을 호출합니다.`);
const response = await fetch(hook, { method: "POST" });
console.log(`deploy hook ${response.status}`);
if (!response.ok) process.exit(1);

const urls = due.map((post) => `${siteConfig.url}/${post.id}/`);
await pingIndexNow(urls);
