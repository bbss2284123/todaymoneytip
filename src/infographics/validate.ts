import type { Fact } from "../lib/check";
import { missingNumbers } from "../lib/check";
import { figures, figuresOf } from "./catalog";
import { figurePlain } from "./text";
import type { Figure } from "./types";

const TAG: Record<Figure["kind"], string> = {
  summary: "SummaryCard",
  bar: "Chart",
  timeline: "Chart",
  steps: "Steps",
  compare: "Compare",
};

export function figureTags(body: string): { tag: string; id: string }[] {
  return [...body.matchAll(/<(SummaryCard|Chart|Steps|Compare)\b[^>]*\bid="([^"]+)"[^>]*\/>/g)].map((match) => ({
    tag: match[1],
    id: match[2],
  }));
}

export function figureProblems(postId: string, body: string, facts: Fact[]): string[] {
  const problems: string[] = [];
  const list = figuresOf(postId);
  if (!figures[postId]) problems.push("본문 그림 목록이 없습니다.");
  if (list.length < 2 || list.length > 4) {
    problems.push(`본문 그림은 2개에서 4개입니다. 목록에는 ${list.length}개입니다.`);
  }
  const tags = figureTags(body);
  const expected = list.map((fig) => `${TAG[fig.kind]}:${fig.id}`);
  const actual = tags.map((tag) => `${tag.tag}:${tag.id}`);
  if (expected.join(",") !== actual.join(",")) {
    problems.push(`그림 태그가 목록과 다릅니다. 기대 ${expected.join(", ")} / 본문 ${actual.join(", ") || "없음"}`);
  }
  const plain = list.map(figurePlain).join("\n");
  const missing = missingNumbers(plain, facts);
  if (missing.length) problems.push(`그림에 원장에 없는 숫자: ${missing.join(", ")}`);
  return problems;
}
