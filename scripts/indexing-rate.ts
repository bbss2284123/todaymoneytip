import { existsSync, readFileSync } from "node:fs";
import { recommendThrottle, indexingRules } from "../src/lib/indexing";

const file = "work/indexing-log.json";
console.log("색인 속도 규칙");
for (const rule of indexingRules) console.log(`- ${rule}`);

if (!existsSync(file)) {
  console.log("\nwork/indexing-log.json이 없습니다. 색인율을 아직 모릅니다.");
  console.log("예시 파일에 indexedRate, consecutiveMisses, recoveryStreakDays를 넣으면 하루 편수를 계산합니다.");
  process.exit(0);
}

const log = JSON.parse(readFileSync(file, "utf8")) as {
  indexedRate: number;
  consecutiveMisses: number;
  recoveryStreakDays: number;
};
const result = recommendThrottle(log);
console.log(`\n수준: ${result.level}`);
console.log(`하루 편수: ${result.postsPerDay}`);
console.log(`발행글 수정: ${result.allowPublishedEdits ? "가능" : "멈춤"}`);
console.log(result.reason);
