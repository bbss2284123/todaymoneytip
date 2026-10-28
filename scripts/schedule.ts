import { existsSync, readFileSync } from "node:fs";
import { siteConfig } from "../site.config";
import { buildPlan, type ScheduleConfig, type ScheduleItem } from "../src/lib/schedule";

export function loadScheduleConfig(): ScheduleConfig {
  return JSON.parse(readFileSync("schedule.config.json", "utf8")) as ScheduleConfig;
}

function sampleQueue(): ScheduleItem[] {
  if (existsSync("data/keyword-queue.json")) {
    const queue = JSON.parse(readFileSync("data/keyword-queue.json", "utf8")) as {
      items?: { id: string; category: string; composition: string; titleFrame: string }[];
    };
    if (queue.items?.length) {
      return queue.items.slice(0, 30).map((item) => ({
        id: item.id,
        category: item.category,
        composition: item.composition,
        frame: item.titleFrame,
      }));
    }
  }
  const frames = ["질문형", "숫자형", "대비형", "상황형", "결과형", "인용형"];
  const compositions = ["해설", "계산", "대비", "추적", "서사"];
  return Array.from({ length: 24 }, (_, index) => ({
    id: `evergreen-${index + 1}`,
    category: siteConfig.categories[index % siteConfig.categories.length].id,
    composition: compositions[index % compositions.length],
    frame: frames[index % frames.length],
  }));
}

export function printPlan(items?: ScheduleItem[], days = 14): void {
  const config = loadScheduleConfig();
  const queue = items ?? sampleQueue();
  const plan = buildPlan(config, queue, 120).slice(0, days);
  console.log(`시드 ${config.seed}`);
  console.log("발행된 글을 지우고 다시 올리지 않습니다. 제목을 한꺼번에 고치지 않습니다.");
  for (const day of plan) {
    if (!day.posts.length) {
      console.log(`${day.date}  쉼`);
      continue;
    }
    const slots = day.posts.map((post) => `${post.time} ${post.category}/${post.frame}`).join(", ");
    console.log(`${day.date}  ${day.posts.length}편  ${slots}`);
  }
}

if (process.argv[1]?.endsWith("schedule.ts")) {
  printPlan();
}
