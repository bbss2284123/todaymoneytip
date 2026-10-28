import { writeFileSync } from "node:fs";
import { buildQueue } from "../src/keywords/engine";
import { enqueueKeyword } from "../src/lib/work";
import { loadPosts } from "../src/lib/check";

const args = process.argv.slice(2);
const categoryFlag = args.indexOf("--category");
const category = categoryFlag >= 0 ? args[categoryFlag + 1] : undefined;
const enqueue = args.includes("--enqueue");
const online = args.includes("--online");

const posts = loadPosts().map((post) => ({
  slug: post.id,
  title: post.data.title,
  serpTitle: post.data.serpTitle,
  keyword: post.data.검색어,
  tags: post.data.tags,
}));

const queue = await buildQueue({
  category,
  env: process.env,
  posts,
  useNetwork: online,
  cacheDir: "data/keyword-cache",
});

writeFileSync("data/keyword-queue.json", `${JSON.stringify(queue, null, 2)}\n`);
console.log(`모드: ${queue.mode}`);
for (const warning of queue.warnings) console.log(`알림: ${warning}`);
console.log(`대기 ${queue.items.length}건 → data/keyword-queue.json`);
for (const item of queue.items.slice(0, 8)) {
  console.log(`- [${item.category}] ${item.score} ${item.primary} / ${item.titleFrame} / ${item.composition} / ${item.timing.note}`);
}

if (enqueue) {
  let added = 0;
  for (const item of queue.items.slice(0, 5)) {
    if (enqueueKeyword(item.id, item.primary)) added += 1;
  }
  console.log(`원장에 ${added}건을 facts 단계로 넣었습니다.`);
}
