import assert from "node:assert/strict";
import test from "node:test";
import {
  blocked,
  buildQueue,
  fitScore,
  hasAdKey,
  naverAds,
  parseGoogleSuggest,
  parseNaverSuggest,
  scoreKeyword,
} from "../src/keywords/engine";

test("광고 키가 없으면 빈 결과", async () => {
  const result = await naverAds(["국민연금"], {}, fetch);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing_key");
  assert.equal(hasAdKey({}), false);
});

test("자동완성 파서", () => {
  assert.deepEqual(parseGoogleSuggest(["국민연금", ["국민연금 수령액", "국민연금 조기"]]), ["국민연금 수령액", "국민연금 조기"]);
  assert.deepEqual(parseNaverSuggest({ items: [["국민연금 얼마", "0"]] }), ["국민연금 얼마"]);
});

test("공모주와 연예 키워드는 버림", () => {
  assert.equal(blocked("공모주 청약"), true);
  assert.equal(blocked("국민연금 조기수령"), false);
});

test("퇴직 키워드가 더 높은 적합도", () => {
  const pension = scoreKeyword({ keyword: "국민연금 조기수령 계산", category: "pension", volume: 1000 });
  const noise = scoreKeyword({ keyword: "오늘 날씨", category: "pension", volume: 1000 });
  assert.ok(pension > noise);
  assert.ok(fitScore("피부양자 조건", "health") > fitScore("날씨", "health"));
});

test("키 없이 대기열을 만듦", async () => {
  const queue = await buildQueue({
    category: "pension",
    env: {},
    useNetwork: false,
    posts: [],
  });
  assert.ok(queue.items.length > 0);
  assert.equal(queue.items[0].gap.copiedText, false);
  assert.ok(queue.warnings.some((line) => line.includes("검색광고")));
});
