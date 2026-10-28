import assert from "node:assert/strict";
import test from "node:test";
import { recommendThrottle } from "../src/lib/indexing";

test("80% 이상이면 하루 3편", () => {
  const row = recommendThrottle({ indexedRate: 0.86, consecutiveMisses: 0, recoveryStreakDays: 0 });
  assert.equal(row.postsPerDay, 3);
  assert.equal(row.allowPublishedEdits, true);
});

test("50에서 80%면 발행 글을 고치지 않음", () => {
  const row = recommendThrottle({ indexedRate: 0.6, consecutiveMisses: 0, recoveryStreakDays: 0 });
  assert.equal(row.postsPerDay, 3);
  assert.equal(row.allowPublishedEdits, false);
});

test("실패 3번이면 하루 2편", () => {
  const row = recommendThrottle({ indexedRate: 0.9, consecutiveMisses: 3, recoveryStreakDays: 0 });
  assert.equal(row.postsPerDay, 2);
});

test("30% 미만이면 하루 1편", () => {
  const row = recommendThrottle({ indexedRate: 0.2, consecutiveMisses: 0, recoveryStreakDays: 0 });
  assert.equal(row.postsPerDay, 1);
});

test("사흘 회복이면 한 단계 올라감", () => {
  const row = recommendThrottle({ indexedRate: 0.2, consecutiveMisses: 0, recoveryStreakDays: 3 });
  assert.equal(row.postsPerDay, 2);
});
