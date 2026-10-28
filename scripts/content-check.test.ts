import assert from "node:assert/strict";
import test from "node:test";
import {
  compositionStreakErrors,
  findBanned,
  glossaryMisses,
  missingNumbers,
  stripIgnored,
  titleFrameErrors,
  type LoadedPost,
} from "../src/lib/check";

const fact = [{ id: "F1", value: "연 2,000만 원", source: "https://example.com", checkedAt: "2026-10-28T00:00:00+09:00" }];

test("원장에 없는 숫자는 실패", () => {
  assert.deepEqual(missingNumbers("보험료는 7.19%입니다.", fact), ["7.19"]);
});

test("원장에 있는 숫자는 통과", () => {
  assert.deepEqual(missingNumbers("한도는 2,000만 원입니다.", fact), []);
});

test("예시 계산기는 숫자 검사에서 빠짐", () => {
  const text = '앞 2,000만 원 <Calculator preset="health" example /> 뒤 9억';
  assert.equal(stripIgnored(text).includes("Calculator"), false);
  assert.deepEqual(missingNumbers(text, fact), ["9"]);
});

test("금지 표현", () => {
  const hits = findBanned("오늘은 연금에 대해 알아보겠습니다.", [{ pattern: "오늘은 .{0,40}알아보", reason: "예고" }]);
  assert.equal(hits.length, 1);
});

test("제목틀은 직전 두 글과 달라야 함", () => {
  const posts = [
    fake("a", "2026-10-01", "질문형", "해설"),
    fake("b", "2026-10-02", "숫자형", "계산"),
    fake("c", "2026-10-03", "질문형", "대비"),
  ];
  assert.equal(titleFrameErrors(posts).length, 1);
});

test("같은 구성 세 번은 실패, 두 번은 통과", () => {
  const two = [fake("a", "2026-10-01", "질문형", "해설"), fake("b", "2026-10-02", "숫자형", "해설")];
  const three = [...two, fake("c", "2026-10-03", "대비형", "해설")];
  assert.equal(compositionStreakErrors(two).length, 0);
  assert.equal(compositionStreakErrors(three).length, 1);
});

test("용어 설명이 없으면 목록에 남음", () => {
  assert.deepEqual(glossaryMisses("피부양자로 남아요."), ["피부양자"]);
  assert.deepEqual(glossaryMisses('앞 <Term id="dependent">피부양자</Term> 뒤'), []);
});

function fake(id: string, date: string, frame: LoadedPost["data"]["제목틀"], composition: LoadedPost["data"]["구성"]): LoadedPost {
  return {
    id,
    file: id,
    body: "",
    raw: "",
    data: {
      title: "제목은 충분히 깁니다",
      serpTitle: "검색 제목도 충분히 깁니다",
      description: "설명도 마흔 글자를 넘겨야 스키마를 통과하는 길이의 문장입니다. 더 적습니다.",
      date,
      updated: date,
      category: "pension",
      tags: ["연금"],
      sources: [{ title: "출처", url: "https://example.com" }],
      featured: false,
      구성: composition,
      제목틀: frame,
      검색어: "국민연금",
      근거: ["F1"],
    },
  };
}
