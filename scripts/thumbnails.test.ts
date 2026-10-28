import assert from "node:assert/strict";
import test from "node:test";
import { fitLines } from "../src/thumbnails/fit";

test("공백에서만 두 줄로 나눔", () => {
  const fitted = fitLines("국민연금 조기수령 계산", 400, 64);
  assert.ok(fitted.lines.length <= 2);
  assert.equal(fitted.lines.join(" "), "국민연금 조기수령 계산");
});

test("긴 제목은 글자를 줄임", () => {
  const fitted = fitLines("퇴직 후 건강보험 피부양자 자격", 280, 80);
  assert.ok(fitted.size < 80);
  assert.ok(fitted.lines.every((line) => line.length > 0));
});
