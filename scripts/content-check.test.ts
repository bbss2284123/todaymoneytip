import assert from "node:assert/strict";
import test from "node:test";
import {
  compositionStreakErrors,
  emphasisWarnings,
  findBanned,
  glossaryMisses,
  keywordPlacementErrors,
  loadPosts,
  markdownMarkersInVisibleHtml,
  missingNumbers,
  stripIgnored,
  titleFrameErrors,
  type LoadedPost,
} from "../src/lib/check";
import { highlightParts } from "../src/lib/highlight";

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

test("빌드된 HTML에 마크다운 별표가 있으면 실패", () => {
  assert.deepEqual(markdownMarkersInVisibleHtml("<p>매달 **6%**가 줄어요.</p>"), ["**"]);
  assert.deepEqual(markdownMarkersInVisibleHtml("<p>매달 <strong>6%</strong>가 줄어요.</p>"), []);
  assert.deepEqual(markdownMarkersInVisibleHtml("<p>본문에 __강조__가 남음</p>"), ["__"]);
  assert.deepEqual(markdownMarkersInVisibleHtml("<script>const x = '**';</script><p>정상</p>"), []);
});

test("대표 검색어는 제목 앞, H1, 설명, 첫 문단에 있어야 함", () => {
  const post = fake("a", "2026-10-01", "질문형", "해설");
  post.data.검색어 = "국민연금 조기수령";
  post.data.serpTitle = "다른 말부터 국민연금 조기수령을 적으면 앞 15자를 넘깁니다";
  post.data.title = "제목에 검색어가 없는 문장입니다";
  post.data.description = "설명에도 검색어가 없고 길이만 맞추려고 글을 늘린 문장입니다. 숫자와 결론이 없습니다. 더 적습니다. 더 적습니다.";
  const errors = keywordPlacementErrors(post.data, "첫 문단에도 검색어가 없어요.");
  assert.ok(errors.length >= 3);
});

test("형광펜과 볼드가 많으면 경고", () => {
  const crowded = `==하나==\n\n## 가\n\n==둘== ==셋==\n\n<strong>답</strong> <strong>또</strong>\n\n## 나\n\n==넷==`;
  const warnings = emphasisWarnings(crowded);
  assert.ok(warnings.some((item) => item.includes("글당 3개")));
  assert.ok(warnings.some((item) => item.includes("구간당 1개")));
  assert.ok(warnings.some((item) => item.includes("답 구절 하나")));
});

test("발행 글의 강조는 한도를 넘지 않음", () => {
  for (const post of loadPosts()) {
    assert.deepEqual(emphasisWarnings(post.body), [], post.id);
  }
});

test("==문장==은 형광펜으로 나뉨", () => {
  assert.deepEqual(highlightParts("앞 ==핵심 문장== 뒤"), [
    { mark: false, text: "앞 " },
    { mark: true, text: "핵심 문장" },
    { mark: false, text: " 뒤" },
  ]);
  assert.deepEqual(highlightParts("닫히지 않은 ==문장"), [{ mark: false, text: "닫히지 않은 ==문장" }]);
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
