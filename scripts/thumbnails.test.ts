import assert from "node:assert/strict";
import test from "node:test";
import { fitLines, thumbLines } from "../src/thumbnails/fit";
import { figurePanels } from "../src/thumbnails/render";

test("공백에서만 두 줄로 나눔", () => {
  const fitted = fitLines("국민연금 조기수령 계산", 400, 64);
  assert.ok(fitted.lines.length <= 2);
  assert.equal(fitted.lines.join(" "), "국민연금 조기수령 계산");
});

test("썸네일 제목은 한 줄 14자, 두 줄", () => {
  const lines = thumbLines("조기수령은 연 6% 연기연금은 7.2%");
  assert.deepEqual(lines, ["조기수령은 연 6%", "연기연금은 7.2%"]);
  assert.ok(lines.every((line) => [...line].length <= 14));
});

test("비교 숫자는 부호와 방향을 적음", () => {
  assert.deepEqual(figurePanels("6% / 7.2%", "국민연금 조기수령"), [
    { label: "1년 일찍", figure: "−6% / 년", tone: "minus" },
    { label: "1년 늦게", figure: "+7.2% / 년", tone: "plus" },
  ]);
  assert.deepEqual(figurePanels("-30%", "퇴직금 일시금"), [
    { label: "줄어드는 금액", figure: "−30%", tone: "minus" },
  ]);
});

test("긴 제목은 글자를 줄임", () => {
  const fitted = fitLines("퇴직 후 건강보험 피부양자 자격", 280, 80);
  assert.ok(fitted.size < 80);
  assert.ok(fitted.lines.every((line) => line.length > 0));
});
