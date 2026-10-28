import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const STAGES = ["facts", "draft", "content-edit", "style-edit", "check", "scheduled", "published"] as const;
export type Stage = (typeof STAGES)[number];

export interface LedgerEntry {
  stage: Stage;
  keyword?: string;
  publishedTitle?: string;
  factsHashAtStyleEdit?: string;
  history: { stage: Stage; at: string; note?: string }[];
}

export interface Ledger {
  posts: Record<string, LedgerEntry>;
}

export function ledgerPath(root = process.cwd()): string {
  return path.join(root, "work/ledger.json");
}

export function readLedger(root = process.cwd()): Ledger {
  const file = ledgerPath(root);
  if (!existsSync(file)) return { posts: {} };
  return JSON.parse(readFileSync(file, "utf8")) as Ledger;
}

export function writeLedger(ledger: Ledger, root = process.cwd()): void {
  const file = ledgerPath(root);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`);
}

export function hashFacts(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

export function nextStep(stage: Stage): string {
  switch (stage) {
    case "facts":
      return "work/<id>/facts.yaml을 채운 뒤 work advance";
    case "draft":
      return "src/content/posts/<id>.mdx 초고를 쓴 뒤 work advance";
    case "content-edit":
      return "숫자와 출처를 원장과 맞춘 뒤 work advance. 여기서 사실 수정은 아직 가능합니다.";
    case "style-edit":
      return "문장만 다듬습니다. facts.yaml은 바꾸지 않습니다. 끝나면 work advance";
    case "check":
      return "npm run check가 통과하면 work advance";
    case "scheduled":
      return "publishAt 이후에 사이트를 다시 빌드합니다. 분은 날짜마다 조금씩 달라집니다.";
    case "published":
      return "발행됨. 제목을 한꺼번에 고치지 않고, 글을 지우고 다시 올리지 않습니다.";
    default:
      return stage;
  }
}

export function advance(id: string, root = process.cwd(), now = new Date()): { ok: boolean; message: string } {
  const ledger = readLedger(root);
  const entry = ledger.posts[id];
  if (!entry) return { ok: false, message: `${id}가 원장에 없습니다.` };
  const index = STAGES.indexOf(entry.stage);
  if (index === STAGES.length - 1) return { ok: false, message: "이미 발행 단계입니다." };
  const factsFile = path.join(root, "work", id, "facts.yaml");
  if (entry.stage === "facts" && !existsSync(factsFile)) {
    return { ok: false, message: "facts.yaml이 없어 초고 단계로 갈 수 없습니다." };
  }
  if (entry.stage === "content-edit") {
    if (!existsSync(factsFile)) return { ok: false, message: "facts.yaml이 없습니다." };
    entry.factsHashAtStyleEdit = hashFacts(factsFile);
  }
  if (entry.stage === "style-edit") {
    if (!entry.factsHashAtStyleEdit || !existsSync(factsFile)) {
      return { ok: false, message: "문장 다듬기 시작 해시가 없습니다." };
    }
    const current = hashFacts(factsFile);
    if (current !== entry.factsHashAtStyleEdit) {
      return { ok: false, message: "문장 다듬기 중에 사실 원장이 바뀌었습니다. 사실을 되돌리세요." };
    }
  }
  const next = STAGES[index + 1];
  entry.stage = next;
  entry.history.push({ stage: next, at: now.toISOString() });
  ledger.posts[id] = entry;
  writeLedger(ledger, root);
  return { ok: true, message: `${id}: ${next}. 다음: ${nextStep(next)}` };
}

export function enqueueKeyword(id: string, keyword: string, root = process.cwd(), now = new Date()): boolean {
  const ledger = readLedger(root);
  if (ledger.posts[id]) return false;
  ledger.posts[id] = {
    stage: "facts",
    keyword,
    history: [{ stage: "facts", at: now.toISOString(), note: "키워드 대기열" }],
  };
  writeLedger(ledger, root);
  return true;
}
