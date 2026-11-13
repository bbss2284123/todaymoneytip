import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { frontmatterLastmod, gitLastCommitDay, indexableCategoryIds, latestDay, postLastmod } from "../src/lib/lastmod";

test("업데이트 날짜가 있으면 발행일보다 앞섭니다", () => {
  assert.equal(
    frontmatterLastmod({ updated: "2026-11-04", updatedAt: "2026-11-01", publishAt: "2026-10-02T12:00", date: "2026-10-01" }),
    "2026-11-04",
  );
});

test("updated가 없으면 updatedAt을 씁니다", () => {
  assert.equal(frontmatterLastmod({ updatedAt: "2026-11-02T15:40", date: "2026-10-01" }), "2026-11-02");
});

test("업데이트 필드가 없으면 발행일입니다", () => {
  assert.equal(frontmatterLastmod({ publishAt: "2026-10-31T18:11", date: "2026-10-01" }), "2026-10-31");
  assert.equal(frontmatterLastmod({ date: "2026-10-26" }), "2026-10-26");
});

test("날짜가 없으면 만들지 않습니다", () => {
  assert.equal(frontmatterLastmod({}), undefined);
  assert.equal(latestDay([undefined, ""]), undefined);
  assert.equal(postLastmod({ id: "missing-post-xyz", filePath: "src/content/posts/missing-post-xyz.mdx", data: {} }), undefined);
});

test("목록은 가장 최근 날짜입니다", () => {
  assert.equal(latestDay(["2026-10-28", "2026-11-04", undefined, "2026-10-31"]), "2026-11-04");
});

test("글이 없는 분류는 빠집니다", () => {
  assert.deepEqual(
    indexableCategoryIds(["pension", "tax", "assets", "business", "job"], [
      { data: { category: "pension" } },
      { data: { category: "job" } },
    ]),
    ["pension", "job"],
  );
});

test("git 날짜는 그 파일의 마지막 커밋이고, 없는 파일은 비웁니다", () => {
  const file = "src/pages/terms.astro";
  const expected = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim();
  assert.equal(gitLastCommitDay([file]), expected);
  assert.match(expected, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(gitLastCommitDay(["src/pages/missing-xyz.astro"]), undefined);
});

test("여러 파일 중 더 최근 커밋을 고릅니다", () => {
  const files = ["src/pages/privacy.astro", "site.config.ts"];
  const days = files.map((file) => gitLastCommitDay([file]));
  assert.equal(gitLastCommitDay(files), latestDay(days));
});
