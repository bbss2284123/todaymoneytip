import assert from "node:assert/strict";
import test from "node:test";
import { dueBetween } from "../src/lib/publish-due";

test("지난 성공 이후, 지금 이전에 공개된 글만 배포 대상이다", () => {
  const posts = [
    { id: "old", at: "2026-10-28" },
    { id: "due", at: "2026-10-29T14:22" },
    { id: "later", at: "2026-10-29T18:00" },
  ];
  const now = new Date("2026-10-29T06:00:00Z");
  const since = new Date("2026-10-29T04:00:00Z");
  assert.deepEqual(
    dueBetween(posts, now, since).map((post) => post.id),
    ["due"],
  );
});
