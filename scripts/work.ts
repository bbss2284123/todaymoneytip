import { readLedger, advance, nextStep } from "../src/lib/work";
import { printPlan } from "./schedule";

const [command, id] = process.argv.slice(2);
if (command === "plan") {
  printPlan();
  process.exit(0);
}
const ledger = readLedger();

if (command === "advance") {
  if (!id) {
    console.error("사용법: npm run work -- advance <id>");
    process.exit(1);
  }
  const result = advance(id);
  console.log(result.message);
  process.exit(result.ok ? 0 : 1);
}

const entries = id ? [[id, ledger.posts[id]] as const] : Object.entries(ledger.posts);
if (id && !ledger.posts[id]) {
  console.error(`${id}가 원장에 없습니다.`);
  process.exit(1);
}
for (const [key, entry] of entries) {
  if (!entry) continue;
  console.log(`${key}`);
  console.log(`  단계: ${entry.stage}`);
  console.log(`  다음: ${nextStep(entry.stage)}`);
  if (entry.keyword) console.log(`  검색어: ${entry.keyword}`);
}
