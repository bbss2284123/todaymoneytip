import assert from "node:assert/strict";
import test from "node:test";
import { buildPlan, gapHours, type ScheduleConfig, type ScheduleItem } from "../src/lib/schedule";

const config: ScheduleConfig = {
  seed: "test-seed",
  launchDate: "2026-10-28",
  launchCount: { min: 5, max: 8 },
  stages: [
    { fromWeek: 1, toWeek: 2, min: 1, max: 2 },
    { fromWeek: 3, toWeek: 4, min: 1, max: 3 },
    { fromWeek: 5, toWeek: null, min: 1, max: 4 },
  ],
  skipEveryDays: { min: 7, max: 10 },
  window: { startHour: 7, endHour: 22 },
  minGapMinutes: 150,
  indexedRate: 1,
  consecutiveMisses: 0,
  recoveryStreakDays: 0,
};

function items(count = 24): ScheduleItem[] {
  const frames = ["질문형", "숫자형", "대비형", "상황형", "결과형", "인용형"];
  const compositions = ["해설", "계산", "대비", "추적", "서사"];
  const categories = ["pension", "health", "severance", "housing", "basic", "job"];
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    category: categories[index % categories.length],
    composition: compositions[index % compositions.length],
    frame: frames[index % frames.length],
  }));
}

test("출시일에 5편에서 8편만 나가고 나머지는 나중", () => {
  const plan = buildPlan(config, items(), 30);
  const first = plan[0].posts.length;
  assert.ok(first >= 5 && first <= 8);
  const assigned = plan.reduce((sum, day) => sum + day.posts.length, 0);
  assert.ok(assigned > first);
  assert.ok(assigned <= 24);
});

test("같은 날 간격은 2.5시간 이상", () => {
  const plan = buildPlan(config, items(), 20);
  for (const day of plan) {
    for (const gap of gapHours(day.posts.map((post) => post.time))) {
      assert.ok(gap >= 2.5);
    }
    for (const post of day.posts) {
      const hour = Number(post.time.slice(0, 2));
      assert.ok(hour >= 7 && hour <= 22);
    }
  }
});

test("색인 스로틀이 출시 편수를 줄임", () => {
  const plan = buildPlan({ ...config, indexedRate: 0.2 }, items(), 5);
  assert.ok(plan[0].posts.length <= 1);
});

test("연속 글은 가능하면 제목틀이 다름", () => {
  const plan = buildPlan(config, items(), 10);
  const flat = plan.flatMap((day) => day.posts);
  let different = 0;
  for (let i = 1; i < flat.length; i++) {
    if (flat[i].frame !== flat[i - 1].frame || flat[i].category !== flat[i - 1].category) different += 1;
  }
  assert.ok(different > flat.length / 2);
});
