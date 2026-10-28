export interface ThrottleInput {
  indexedRate: number;
  consecutiveMisses: number;
  recoveryStreakDays: number;
}

export interface Throttle {
  level: "full" | "hold-edits" | "two-a-day" | "one-a-day";
  postsPerDay: 1 | 2 | 3;
  allowPublishedEdits: boolean;
  reason: string;
}

type Level = 0 | 1 | 2 | 3;

function baseLevel(input: ThrottleInput): Level {
  if (input.indexedRate < 0.3) return 3;
  if (input.consecutiveMisses >= 3) return 2;
  if (input.indexedRate < 0.8) return 1;
  return 0;
}

const TABLE: Record<Level, Omit<Throttle, "reason">> = {
  0: { level: "full", postsPerDay: 3, allowPublishedEdits: true },
  1: { level: "hold-edits", postsPerDay: 3, allowPublishedEdits: false },
  2: { level: "two-a-day", postsPerDay: 2, allowPublishedEdits: false },
  3: { level: "one-a-day", postsPerDay: 1, allowPublishedEdits: false },
};

export function recommendThrottle(input: ThrottleInput): Throttle {
  let level = baseLevel(input);
  let recovered = false;
  if (input.recoveryStreakDays >= 3 && level > 0) {
    level = (level - 1) as Level;
    recovered = true;
  }
  const row = TABLE[level];
  const reason = recovered
    ? "새 글이 사흘 연속 6시간 안에 색인되어 한 단계 올렸습니다."
    : level === 3
      ? "색인 비율이 30% 미만이라 하루에 1편입니다."
      : level === 2
        ? "색인 실패가 3번 이어져 하루에 2편입니다."
        : level === 1
          ? "색인이 50~80%라 발행된 글은 고치지 않습니다."
          : "색인이 80% 이상이라 하루에 3편입니다.";
  return { ...row, reason };
}

export const indexingRules = [
  "색인 80% 이상: 하루 3편.",
  "색인 50~80%: 발행된 글은 고치지 않습니다.",
  "색인 실패가 3번 연속: 하루 2편.",
  "색인 30% 미만: 하루 1편.",
  "새 글이 사흘 연속 6시간 안에 색인되면 한 단계 회복합니다.",
  "글을 지우고 다시 올리지 않습니다.",
  "발행된 제목을 한꺼번에 고치지 않습니다.",
];
